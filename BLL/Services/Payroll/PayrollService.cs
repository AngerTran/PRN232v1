using BLL.Dtos.Payroll;
using BLL.Common;
using BLL.Services.Workflow;
using DAL.Common;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace BLL.Services.Payroll;

public class PayrollService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly NotificationService _notificationService;

    public PayrollService(UnitOfWork unitOfWork, NotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<AssistantPayrollSummaryItem>> ListSummariesAsync(
        Guid callerId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);

        var (rangeStart, rangeEnd) = ResolveMonthRange(year, month);
        var rows = await LoadApprovedTaskRowsAsync(rangeStart, rangeEnd, cancellationToken);

        return rows
            .Where(r => r.AssignedTo.HasValue)
            .GroupBy(r => r.AssignedTo!.Value)
            .Select(g =>
            {
                var first = g.First();
                var unpaid = g.Where(t => !IsPaid(t.PaymentStatus)).ToList();
                var paid = g.Where(t => IsPaid(t.PaymentStatus)).ToList();
                return new AssistantPayrollSummaryItem(
                    g.Key,
                    first.AssistantName ?? "Assistant",
                    first.AssistantEmail ?? "",
                    unpaid.Count,
                    unpaid.Sum(t => t.Price),
                    paid.Count,
                    paid.Sum(t => t.Price),
                    first.PayoutBankName,
                    first.PayoutBankAccountNumber,
                    first.PayoutBankAccountHolder);
            })
            .OrderByDescending(s => s.UnpaidAmount)
            .ThenBy(s => s.AssistantName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<AssistantPayrollDetailResponse?> GetAssistantDetailAsync(
        Guid callerId,
        Guid assistantId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);

        var assistant = await _unitOfWork.Repository<Profile>().GetByIdAsync(assistantId, cancellationToken: cancellationToken);
        if (assistant is null || assistant.Role != ProfileRole.Assistant)
        {
            return null;
        }

        var (rangeStart, rangeEnd) = ResolveMonthRange(year, month);
        var rows = await LoadApprovedTaskRowsAsync(rangeStart, rangeEnd, cancellationToken, assistantId);
        var unpaid = rows.Where(r => !IsPaid(r.PaymentStatus)).ToList();

        return new AssistantPayrollDetailResponse(
            assistantId,
            assistant.FullName,
            assistant.Email,
            unpaid.Count,
            unpaid.Sum(t => t.Price),
            unpaid.Select(t => new UnpaidPayrollTaskItem(
                t.TaskId,
                t.Title ?? "Task",
                t.Price,
                t.CompletedAt,
                t.SeriesTitle)).ToList(),
            assistant.PayoutBankName,
            assistant.PayoutBankAccountNumber,
            assistant.PayoutBankAccountHolder);
    }

    public async Task<MarkAssistantPayrollPaidResponse> MarkPaidAsync(
        Guid callerId,
        MarkAssistantPayrollPaidRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);

        var assistant = await _unitOfWork.Repository<Profile>().GetByIdAsync(request.AssistantId, cancellationToken: cancellationToken)
            ?? throw new ArgumentException("Assistant not found.");
        if (assistant.Role != ProfileRole.Assistant)
        {
            throw new ArgumentException("Chỉ đánh dấu chi trả cho tài khoản assistant.");
        }

        if (request.Year is int payoutYear && request.Month is int payoutMonth
            && !PayrollRules.CanMarkPeriodPaid(payoutYear, payoutMonth, DateTime.UtcNow))
        {
            throw new InvalidOperationException(
                $"Chưa đến kỳ chi trả tháng {payoutMonth:D2}/{payoutYear}. Kế toán chi vào ngày {PayrollRules.FormatPayoutDate(payoutYear, payoutMonth)} (giờ Việt Nam).");
        }

        var (rangeStart, rangeEnd) = ResolveMonthRange(request.Year, request.Month);
        var query = _unitOfWork.Context.Tasks
            .Where(t => t.AssignedTo == request.AssistantId
                && t.Status == TaskStatuses.Approved
                && t.PaymentStatus != PaymentStatuses.Paid);

        if (rangeStart.HasValue && rangeEnd.HasValue)
        {
            query = query.Where(t => t.CompletedAt >= rangeStart && t.CompletedAt < rangeEnd);
        }

        if (request.TaskIds is { Count: > 0 })
        {
            var ids = request.TaskIds.ToHashSet();
            query = query.Where(t => ids.Contains(t.Id));
        }

        var tasks = await query.ToListAsync(cancellationToken);
        if (tasks.Count == 0)
        {
            return new MarkAssistantPayrollPaidResponse(request.AssistantId, 0, 0, request.PaymentReference);
        }

        if (request.Year is null || request.Month is null)
        {
            var blocked = tasks
                .Where(t => t.CompletedAt.HasValue)
                .Select(t => PayrollRules.GetVietnamPeriod(t.CompletedAt!.Value))
                .Distinct()
                .Where(p => !PayrollRules.CanMarkPeriodPaid(p.Year, p.Month, DateTime.UtcNow))
                .ToList();

            if (blocked.Count > 0)
            {
                var first = blocked[0];
                throw new InvalidOperationException(
                    $"Chưa đến kỳ chi trả tháng {first.Month:D2}/{first.Year}. Kế toán chi vào ngày {PayrollRules.FormatPayoutDate(first.Year, first.Month)} (giờ Việt Nam).");
            }
        }

        var paymentReference = string.IsNullOrWhiteSpace(request.PaymentReference)
            ? null
            : request.PaymentReference.Trim();
        var now = DateTime.UtcNow;
        var total = 0m;
        foreach (var task in tasks)
        {
            task.PaymentStatus = PaymentStatuses.Paid;
            task.PaidAt = now;
            task.PaymentReference = paymentReference;
            task.UpdatedAt = now;
            total += task.Price;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var monthLabel = request.Year is int y && request.Month is int m
            ? $"tháng {m:D2}/{y}"
            : "các task đã chọn";

        var refNote = string.IsNullOrWhiteSpace(paymentReference)
            ? string.Empty
            : $" Mã tham chiếu: {paymentReference}.";

        await _notificationService.CreateAsync(
            request.AssistantId,
            "Thù lao đã được chi trả",
            $"Kế toán đã đánh dấu đã chi trả {tasks.Count} task ({total:N0} VNĐ) — {monthLabel}.{refNote} Tiền được chuyển theo kỳ chi trả cố định (ngày {PayrollRules.PayoutDayOfMonth} hàng tháng).",
            "/assistant/income",
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken: cancellationToken);

        return new MarkAssistantPayrollPaidResponse(request.AssistantId, tasks.Count, total, paymentReference);
    }

    private async Task RequireAdminAsync(Guid callerId, CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
        if (!PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Chỉ Admin / kế toán được quản lý chi trả thù lao.");
        }
    }

    private static (DateTime? Start, DateTime? End) ResolveMonthRange(int? year, int? month)
    {
        if (year is null || month is null)
        {
            return (null, null);
        }

        var start = new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc);
        return (start, start.AddMonths(1));
    }

    private static bool IsPaid(string? status) =>
        string.Equals(status, PaymentStatuses.Paid, StringComparison.OrdinalIgnoreCase);

    private sealed record PayrollTaskRow(
        Guid TaskId,
        Guid? AssignedTo,
        string? AssistantName,
        string? AssistantEmail,
        string? PayoutBankName,
        string? PayoutBankAccountNumber,
        string? PayoutBankAccountHolder,
        string? Title,
        decimal Price,
        string PaymentStatus,
        DateTime? CompletedAt,
        string? SeriesTitle);

    private async Task<List<PayrollTaskRow>> LoadApprovedTaskRowsAsync(
        DateTime? rangeStart,
        DateTime? rangeEnd,
        CancellationToken cancellationToken,
        Guid? assistantId = null)
    {
        var query =
            from task in _unitOfWork.Context.Tasks.AsNoTracking()
            join page in _unitOfWork.Context.Pages.AsNoTracking() on task.PageId equals page.Id
            join chapter in _unitOfWork.Context.Chapters.AsNoTracking() on page.ChapterId equals chapter.Id
            join series in _unitOfWork.Context.Series.AsNoTracking() on chapter.SeriesId equals series.Id
            join assistant in _unitOfWork.Context.Profiles.AsNoTracking() on task.AssignedTo equals assistant.Id into assistants
            from assistant in assistants.DefaultIfEmpty()
            where task.Status == TaskStatuses.Approved && task.AssignedTo != null
            select new { task, series, assistant };

        if (assistantId.HasValue)
        {
            query = query.Where(x => x.task.AssignedTo == assistantId.Value);
        }

        if (rangeStart.HasValue && rangeEnd.HasValue)
        {
            query = query.Where(x => x.task.CompletedAt >= rangeStart && x.task.CompletedAt < rangeEnd);
        }

        var rows = await query
            .OrderByDescending(x => x.task.CompletedAt)
            .Select(x => new PayrollTaskRow(
                x.task.Id,
                x.task.AssignedTo,
                x.assistant != null ? x.assistant.FullName : null,
                x.assistant != null ? x.assistant.Email : null,
                x.assistant != null ? x.assistant.PayoutBankName : null,
                x.assistant != null ? x.assistant.PayoutBankAccountNumber : null,
                x.assistant != null ? x.assistant.PayoutBankAccountHolder : null,
                x.task.Title,
                x.task.Price,
                x.task.PaymentStatus,
                x.task.CompletedAt,
                x.series.Title))
            .ToListAsync(cancellationToken);

        return rows;
    }
}
