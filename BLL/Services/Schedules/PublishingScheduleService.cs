using Microsoft.EntityFrameworkCore;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Dtos.Schedules;
using BLL.Services.Notifications;
using BLL.Common;

namespace BLL.Services.Schedules;

public class PublishingScheduleService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly NotificationService _notificationService;
    private Repository<PublishingSchedule> Repository => _unitOfWork.Repository<PublishingSchedule>();

    public PublishingScheduleService(UnitOfWork unitOfWork, NotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<PublishingScheduleResponse>> ListBySeriesAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        _ = await RequireSeriesAccessAsync(callerId, seriesId, cancellationToken);

        var items = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Where(s => s.SeriesId == seriesId)
            .OrderBy(s => s.PublishDate)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task<PublishingScheduleResponse> CreateAsync(
        Guid callerId,
        Guid seriesId,
        CreatePublishingScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PublishingFrequencies.IsValid(request.Frequency))
        {
            throw new ArgumentException($"Invalid frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
        }

        EnsurePublishDateNotInPast(request.PublishDate);

        var series = await RequireScheduleManagerAsync(callerId, seriesId, cancellationToken);
        try
        {
            SeriesWorkflowRules.EnsureAllowsPublishingSchedule(series.Status);
        }
        catch (InvalidOperationException ex)
        {
            throw new WorkflowForbiddenException(ex.Message);
        }

        var schedule = new PublishingSchedule
        {
            Id = Guid.NewGuid(),
            SeriesId = seriesId,
            PublishDate = request.PublishDate,
            Frequency = PublishingFrequencies.ParseOrDefault(request.Frequency),
            IssueNumber = request.IssueNumber,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(schedule, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var dateLabel = request.PublishDate.ToString("dd/MM/yyyy");
        var scheduleMessage =
            $"Lịch xuất bản mới cho \"{series.Title}\" — ngày {dateLabel} (số {request.IssueNumber}).";

        await _notificationService.CreateAsync(
            series.AuthorId,
            "Lịch xuất bản mới",
            scheduleMessage,
            WorkflowNotificationPaths.MangakaSeries(seriesId),
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken: cancellationToken);

        if (series.EditorId is Guid editorId)
        {
            await _notificationService.CreateAsync(
                editorId,
                "Lịch xuất bản mới",
                scheduleMessage,
                WorkflowNotificationPaths.EditorSeries(seriesId),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }

        return Map(schedule);
    }

    public async Task<PublishingScheduleResponse?> UpdateAsync(
        Guid callerId,
        Guid scheduleId,
        UpdatePublishingScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Frequency is not null && !PublishingFrequencies.IsValid(request.Frequency))
        {
            throw new ArgumentException($"Invalid frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
        }

        var schedule = await Repository.GetByIdAsync(scheduleId, asNoTracking: false, cancellationToken);
        if (schedule is null || schedule.SeriesId is null)
        {
            return null;
        }

        var series = await RequireScheduleManagerAsync(callerId, schedule.SeriesId.Value, cancellationToken);
        var oldDate = schedule.PublishDate;
        var dateChanged = false;

        if (request.PublishDate is not null)
        {
            EnsurePublishDateNotInPast(request.PublishDate.Value);
            dateChanged = request.PublishDate.Value != oldDate;
            schedule.PublishDate = request.PublishDate.Value;
        }

        if (request.Frequency is not null)
        {
            schedule.Frequency = PublishingFrequencies.ParseOrDefault(request.Frequency);
        }

        if (request.IssueNumber is not null)
        {
            schedule.IssueNumber = request.IssueNumber;
        }

        if (request.Notes is not null)
        {
            schedule.Notes = request.Notes;
        }

        Repository.Update(schedule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (dateChanged)
        {
            var newLabel = schedule.PublishDate.ToString("dd/MM/yyyy");
            var oldLabel = oldDate.ToString("dd/MM/yyyy");
            var note = string.IsNullOrWhiteSpace(schedule.Notes) ? "" : $" Lý do/ghi chú: {schedule.Notes}";
            var message =
                $"Lịch XB \"{series.Title}\" kỳ {schedule.IssueNumber?.ToString() ?? "—"} đã dời từ {oldLabel} sang {newLabel}.{note}";

            await _notificationService.CreateAsync(
                series.AuthorId,
                "Đã dời lịch xuất bản",
                message,
                WorkflowNotificationPaths.MangakaSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);

            if (series.EditorId is Guid editorId)
            {
                await _notificationService.CreateAsync(
                    editorId,
                    "Đã dời lịch xuất bản",
                    message,
                    WorkflowNotificationPaths.EditorSeries(series.Id),
                    WorkflowNotificationPaths.CategorySubmission,
                    cancellationToken: cancellationToken);
            }
        }

        return Map(schedule);
    }

    public async Task<bool> DeleteAsync(Guid callerId, Guid scheduleId, CancellationToken cancellationToken = default)
    {
        var schedule = await Repository.GetByIdAsync(scheduleId, asNoTracking: false, cancellationToken);
        if (schedule is null || schedule.SeriesId is null)
        {
            return false;
        }

        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        if (!PageAccessService.IsAdmin(caller.Role))
        {
            await RequireScheduleManagerAsync(callerId, schedule.SeriesId.Value, cancellationToken);
        }

        Repository.Remove(schedule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<DAL.Models.Series> RequireSeriesAccessAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Series not found.");

        if (PageAccessService.IsAdmin(caller.Role)
            || PageAccessService.IsBoard(caller.Role)
            || series.AuthorId == caller.Id
            || (PageAccessService.IsEditor(caller.Role) && series.EditorId == caller.Id))
        {
            return series;
        }

        throw new WorkflowForbiddenException("You do not have permission to view schedules for this series.");
    }

    private async Task<DAL.Models.Series> RequireScheduleManagerAsync(Guid callerId, Guid seriesId, CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Series not found.");

        if (PageAccessService.IsAdmin(caller.Role))
        {
            return series;
        }

        if (PageAccessService.IsBoard(caller.Role))
        {
            var isLead = await _unitOfWork.Context.SeriesBoardReviewClaims
                .AnyAsync(c => c.SeriesId == seriesId && c.BoardMemberId == callerId && c.IsLead, cancellationToken);
            if (!isLead)
            {
                throw new WorkflowForbiddenException("Chỉ board phụ trách chính mới được sắp lịch xuất bản.");
            }

            return series;
        }

        throw new WorkflowForbiddenException("Requires board lead or admin.");
    }

    private static void EnsurePublishDateNotInPast(DateOnly publishDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (publishDate < today)
        {
            throw new ArgumentException("Không thể chọn ngày phát hành trong quá khứ.");
        }
    }

    private static PublishingScheduleResponse Map(PublishingSchedule s) =>
        new(
            s.Id,
            s.SeriesId,
            s.PublishDate,
            PublishingFrequencies.ToDbValue(s.Frequency),
            s.IssueNumber,
            s.Notes,
            s.CreatedAt);
}
