using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Services.Notifications;
using BLL.Services.Storage;
using BLL.Configuration;
using System.Text.Json;

namespace BLL.Services.Tasks;

public class TaskService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly PageAccessService _pageAccess;
    private readonly NotificationService _notificationService;
    private readonly SupabaseStorageService _storage;
    private readonly SupabaseOptions _supabaseOptions;
    private readonly VnPayService _vnPayService;
    private readonly VnPayOptions _vnPayOptions; // Thêm dòng này
    private Repository<EditorTask> TaskRepository => _unitOfWork.Repository<EditorTask>();
    private Repository<Profile> ProfileRepository => _unitOfWork.Repository<Profile>();

    public TaskService(
        UnitOfWork unitOfWork,
        PageAccessService pageAccess,
        NotificationService notificationService,
        SupabaseStorageService storage,
        IOptions<SupabaseOptions> supabaseOptions,
        VnPayService vnPayService,
        IOptions<VnPayOptions> vnPayOptions) // Thêm tham số này
    {
        _unitOfWork = unitOfWork;
        _pageAccess = pageAccess;
        _notificationService = notificationService;
        _storage = storage;
        _supabaseOptions = supabaseOptions.Value;
        _vnPayService = vnPayService;
        _vnPayOptions = vnPayOptions.Value; // Lưu giá trị options
    }

    public async Task<TaskItemResponse?> UploadResourcesAsync(
        Guid callerId,
        Guid taskId,
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var task = await TaskRepository.GetByIdAsync(taskId, asNoTracking: false, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var ctx = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");

        if (!_pageAccess.CanAssignTasks(caller, ctx))
        {
            throw new WorkflowForbiddenException("You do not have permission to add resources to this task.");
        }

        var urls = task.ResourceUrls?.ToList() ?? new List<string>();
        foreach (var file in files)
        {
            if (file.Length <= 0)
            {
                continue;
            }

            var objectPath = $"tasks/{taskId}/resources/{Guid.NewGuid():N}_{file.FileName}";
            var url = await _storage.UploadAsync(_supabaseOptions.SubmissionsBucket, objectPath, file, cancellationToken);
            urls.Add(url);
        }

        task.ResourceUrls = urls;
        task.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapTaskItem(task, task.AssignedToNavigation?.FullName);
    }

    public async Task<KanbanResponse> GetKanbanByChapterAsync(
        Guid callerId,
        Guid chapterId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!PageAccessService.IsMangaka(caller.Role) && !PageAccessService.IsAssistant(caller.Role) && !PageAccessService.IsStaff(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires mangaka, assistant, editor, board, or admin.");
        }

        var chapter = await _unitOfWork.Context.Chapters
            .AsNoTracking()
            .Include(c => c.Series)
            .FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken);

        if (chapter is null)
        {
            throw new WorkflowForbiddenException("Chapter not found.");
        }

        if (!CanAccessChapter(caller, chapter))
        {
            throw new WorkflowForbiddenException("You do not have permission to view this kanban.");
        }

        var pageIds = await _unitOfWork.Context.Pages
            .AsNoTracking()
            .Where(p => p.ChapterId == chapterId)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        var tasks = await _unitOfWork.Context.Tasks
            .AsNoTracking()
            .Where(t => pageIds.Contains(t.PageId))
            .ToListAsync(cancellationToken);

        if (PageAccessService.IsAssistant(caller.Role) && !PageAccessService.IsStaff(caller.Role))
        {
            tasks = tasks.Where(t => t.AssignedTo == callerId).ToList();
        }

        var items = tasks.Select(MapKanbanItem).ToList();
        return new KanbanResponse(
            items.Where(i => i.Status == TaskStatuses.Todo).ToList(),
            items.Where(i => i.Status is TaskStatuses.InProgress or TaskStatuses.Submitted).ToList(),
            items.Where(i => i.Status is TaskStatuses.Approved or TaskStatuses.Rejected).ToList());
    }

    public async Task<IReadOnlyList<TaskItemResponse>> ListMyTasksAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!PageAccessService.IsAssistant(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires assistant role.");
        }

        var tasks = await _unitOfWork.Context.Tasks
            .AsNoTracking()
            .Include(t => t.AssignedToNavigation)
            .Include(t => t.AssignedByNavigation)
            .Where(t => t.AssignedTo == callerId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        return tasks.Select(t => MapTaskItem(t, t.AssignedToNavigation?.FullName)).ToList();
    }

    public async Task<TaskItemResponse?> GetByIdAsync(
        Guid callerId,
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        var task = await LoadTaskAsync(taskId, cancellationToken);
        if (task is null)
        {
            return null;
        }

        await EnsureCanViewTaskAsync(callerId, task, cancellationToken);
        return MapTaskItem(task, task.AssignedToNavigation?.FullName);
    }

    // Postgres `timestamptz` chỉ chấp nhận UTC. Deadline từ client thường có Kind=Unspecified
    // (vd "2026-06-10"), nên cần ép về UTC trước khi lưu để tránh lỗi Npgsql.
    private static DateTime? ToUtc(DateTime? value)
    {
        if (value is null)
        {
            return null;
        }

        var v = value.Value;
        return v.Kind switch
        {
            DateTimeKind.Utc => v,
            DateTimeKind.Local => v.ToUniversalTime(),
            _ => DateTime.SpecifyKind(v, DateTimeKind.Utc)
        };
    }

    public async Task<TaskItemResponse> CreateAsync(
        Guid callerId,
        Guid pageId,
        CreateTaskRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!TaskTypes.IsValid(request.TaskType))
        {
            throw new ArgumentException($"Invalid task type. Allowed: {string.Join(", ", TaskTypes.All)}.");
        }

        var region = NormalizeRegionJson(request.Region);

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var ctx = await _pageAccess.GetPageContextAsync(pageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");

        if (!_pageAccess.CanAssignTasks(caller, ctx))
        {
            throw new WorkflowForbiddenException("Only mangaka, assigned editor, or admin can create tasks.");
        }

        if (!PageAccessService.IsAdmin(caller.Role))
        {
            try
            {
                SeriesWorkflowRules.EnsureAllowsStudioProduction(ctx.Series.Status);
            }
            catch (InvalidOperationException ex)
            {
                throw new WorkflowForbiddenException(ex.Message);
            }
        }

        if (request.AssignedTo is not null)
        {
            await EnsureCanAssignAssistantAsync(caller, request.AssignedTo.Value, cancellationToken);
        }

        var now = DateTime.UtcNow;
        var task = new EditorTask
        {
            Id = Guid.NewGuid(),
            PageId = pageId,
            TaskType = request.TaskType.Trim(),
            Region = region,
            Title = request.Title?.Trim(),
            Description = request.Description,
            AssignedTo = request.AssignedTo,
            AssignedBy = callerId,
            Priority = request.Priority ?? 1,
            Status = TaskStatuses.Todo,
            Deadline = ToUtc(request.Deadline),
            Price = request.Price ?? 0m,
            CreatedAt = now,
            UpdatedAt = now
        };

        await TaskRepository.AddAsync(task, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await SyncPageStatusFromTasksAsync(pageId, cancellationToken);

        if (task.AssignedTo is not null)
        {
            await _notificationService.CreateAsync(
                task.AssignedTo.Value,
                "Task mới được giao",
                $"{ctx.Series.Title} - Trang {ctx.Page.PageNumber}: {task.Title ?? task.TaskType} đã được giao cho bạn.",
                cancellationToken);
        }

        return (await GetByIdAsync(callerId, task.Id, cancellationToken))!;
    }

    public async Task<TaskItemResponse?> UpdateAsync(
        Guid callerId,
        Guid taskId,
        UpdateTaskRequest request,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var task = await TaskRepository.GetByIdAsync(taskId, asNoTracking: false, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var previousAssigneeId = task.AssignedTo;

        var ctx = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");

        if (!_pageAccess.CanAssignTasks(caller, ctx))
        {
            throw new WorkflowForbiddenException("You do not have permission to update this task.");
        }

        if (request.AssignedTo is not null)
        {
            await EnsureCanAssignAssistantAsync(caller, request.AssignedTo.Value, cancellationToken);

            task.AssignedTo = request.AssignedTo;
        }

        if (request.Title is not null)
        {
            task.Title = request.Title.Trim();
        }

        if (request.Description is not null)
        {
            task.Description = request.Description;
        }

        if (request.Region is not null)
        {
            task.Region = NormalizeRegionJson(request.Region);
        }

        if (request.Priority is not null)
        {
            task.Priority = request.Priority;
        }

        if (request.Deadline is not null)
        {
            task.Deadline = ToUtc(request.Deadline);
        }

        if (request.Price is not null)
        {
            task.Price = request.Price.Value;
        }

        task.UpdatedAt = DateTime.UtcNow;
        TaskRepository.Update(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (request.AssignedTo is not null && request.AssignedTo != previousAssigneeId)
        {
            await _notificationService.CreateAsync(
                request.AssignedTo.Value,
                "Task mới được giao",
                $"{ctx.Series.Title} - Trang {ctx.Page.PageNumber}: {task.Title ?? task.TaskType} đã được giao cho bạn.",
                cancellationToken);
        }

        return await GetByIdAsync(callerId, taskId, cancellationToken);
    }

    public async Task<TaskItemResponse?> UpdateStatusAsync(
        Guid callerId,
        Guid taskId,
        UpdateTaskStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!TaskStatuses.IsValid(request.Status))
        {
            throw new ArgumentException($"Invalid status. Allowed: {string.Join(", ", TaskStatuses.All)}.");
        }

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var task = await TaskRepository.GetByIdAsync(taskId, asNoTracking: false, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var newStatus = request.Status.Trim();
        if (!CanChangeTaskStatus(caller, task, newStatus))
        {
            throw new WorkflowForbiddenException($"Role '{caller.Role}' cannot set task status to '{newStatus}'.");
        }

        var now = DateTime.UtcNow;
        if (newStatus == TaskStatuses.InProgress && task.StartedAt is null)
        {
            task.StartedAt = now;
        }

        if (newStatus is TaskStatuses.Approved or TaskStatuses.Rejected)
        {
            task.CompletedAt = now;
        }

        task.Status = newStatus;
        task.UpdatedAt = now;
        TaskRepository.Update(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await SyncPageStatusFromTasksAsync(task.PageId, cancellationToken);

        return await GetByIdAsync(callerId, taskId, cancellationToken);
    }

    // Tự cập nhật trạng thái trang theo tiến độ các task của trang đó:
    //  - không có task            → draft (bản nháp)
    //  - tất cả task đã duyệt      → approved (hoàn thành)
    //  - có task đang nộp/đã duyệt → reviewing (đang xét duyệt)
    //  - còn lại (đã giao việc)    → assigned (đã giao)
    private async Task SyncPageStatusFromTasksAsync(Guid pageId, CancellationToken cancellationToken)
    {
        var page = await _unitOfWork.Context.Pages
            .FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);
        if (page is null)
        {
            return;
        }

        var statuses = await _unitOfWork.Context.Tasks
            .Where(t => t.PageId == pageId)
            .Select(t => t.Status)
            .ToListAsync(cancellationToken);

        PageStatus newStatus;
        if (statuses.Count == 0)
        {
            newStatus = PageStatus.Draft;
        }
        else if (statuses.All(s => s == TaskStatuses.Approved))
        {
            newStatus = PageStatus.Approved;
        }
        else if (statuses.Any(s => s == TaskStatuses.Submitted || s == TaskStatuses.Approved))
        {
            newStatus = PageStatus.Reviewing;
        }
        else
        {
            newStatus = PageStatus.Assigned;
        }

        if (page.Status != newStatus)
        {
            page.Status = newStatus;
            page.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<bool> DeleteAsync(Guid callerId, Guid taskId, CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var task = await TaskRepository.GetByIdAsync(taskId, asNoTracking: false, cancellationToken);
        if (task is null)
        {
            return false;
        }

        var ctx = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");

        if (!PageAccessService.IsAdmin(caller.Role) && !_pageAccess.CanAssignTasks(caller, ctx))
        {
            throw new WorkflowForbiddenException("You do not have permission to delete this task.");
        }

        var pageId = task.PageId;
        TaskRepository.Remove(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await SyncPageStatusFromTasksAsync(pageId, cancellationToken);
        return true;
    }

    internal async Task<EditorTask?> LoadTaskAsync(Guid taskId, CancellationToken cancellationToken) =>
        await _unitOfWork.Context.Tasks
            .Include(t => t.AssignedToNavigation)
            .Include(t => t.AssignedByNavigation)
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

    private async Task EnsureCanViewTaskAsync(Guid callerId, EditorTask task, CancellationToken cancellationToken)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (task.AssignedTo == callerId || PageAccessService.IsStaff(caller.Role))
        {
            var ctx = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken);
            if (ctx is not null && (PageAccessService.IsStaff(caller.Role) || _pageAccess.CanManageStudio(caller, ctx) || task.AssignedTo == callerId))
            {
                return;
            }
        }

        if (await _pageAccess.CanViewPageAsync(caller, (await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken))!, cancellationToken))
        {
            return;
        }

        throw new WorkflowForbiddenException("You do not have permission to view this task.");
    }

    private static bool CanAccessChapter(Profile caller, Chapter chapter) =>
        PageAccessService.IsAdmin(caller.Role)
        || PageAccessService.IsBoard(caller.Role)
        || chapter.Series.AuthorId == caller.Id
        || (PageAccessService.IsEditor(caller.Role) && chapter.Series.EditorId == caller.Id)
        || PageAccessService.IsAssistant(caller.Role);

    private static bool CanChangeTaskStatus(Profile caller, EditorTask task, string newStatus)
    {
        if (PageAccessService.IsAdmin(caller.Role))
        {
            return true;
        }

        if (PageAccessService.IsAssistant(caller.Role) && task.AssignedTo == caller.Id)
        {
            return newStatus is TaskStatuses.Todo
                or TaskStatuses.InProgress
                or TaskStatuses.Submitted;
        }

        if (PageAccessService.IsMangaka(caller.Role) || PageAccessService.IsEditor(caller.Role))
        {
            return newStatus is TaskStatuses.Todo
                or TaskStatuses.InProgress
                or TaskStatuses.Submitted
                or TaskStatuses.Approved
                or TaskStatuses.Rejected;
        }

        return false;
    }

    private async Task EnsureCanAssignAssistantAsync(
        Profile caller,
        Guid assistantId,
        CancellationToken cancellationToken)
    {
        var assignee = await ProfileRepository.GetByIdAsync(assistantId, cancellationToken: cancellationToken);
        if (assignee is null || assignee.Role != ProfileRole.Assistant || assignee.IsActive == false)
        {
            throw new ArgumentException("AssignedTo must reference an active assistant profile.");
        }

        if (PageAccessService.IsMangaka(caller.Role))
        {
            var belongsToMangaka = await _unitOfWork.Context.MangakaAssistants
                .AnyAsync(
                    link => link.MangakaId == caller.Id
                        && link.AssistantId == assistantId
                        && link.Status == "accepted",
                    cancellationToken);

            if (!belongsToMangaka)
            {
                throw new WorkflowForbiddenException("Mangaka can only assign tasks to assistants in their studio.");
            }
        }
    }

    private static KanbanColumnItemResponse MapKanbanItem(EditorTask t) =>
        new(t.Id, t.TaskType, t.Status, t.PageId, t.Title, t.AssignedTo);

    private static TaskItemResponse MapTaskItem(EditorTask t, string? assignedToName, string? assignedByName = null) =>
        new(
            t.Id,
            t.PageId,
            t.TaskType,
            t.Status,
            t.Title,
            t.Description,
            t.Region,
            t.AssignedTo,
            assignedToName,
            t.AssignedBy,
            t.Priority,
            t.Deadline,
            t.StartedAt,
            t.CompletedAt,
            t.CreatedAt,
            t.ResourceUrls,
            assignedByName ?? t.AssignedByNavigation?.FullName,
            t.Price);

    private static string NormalizeRegionJson(string region)
    {
        if (string.IsNullOrWhiteSpace(region))
        {
            throw new ArgumentException("Region is required.");
        }

        try
        {
            using var document = JsonDocument.Parse(region);
            return document.RootElement.GetRawText();
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("Region must be valid JSON.", ex);
        }
    }

    public async Task<CreateTaskPaymentResponse?> CreateTaskPaymentAsync(
        Guid callerId,
        Guid taskId,
        CreateTaskPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var task = await TaskRepository.GetByIdAsync(taskId, asNoTracking: false, cancellationToken);
        if (task is null)
        {
            return null;
        }

        // Only the mangaka/editor who assigned the task (or admin) can initiate payment
        // Assistant should NOT be able to initiate payment for their own task
        var ctxForAuth = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");
        
        bool isAssigner = task.AssignedBy == callerId;
        bool isMangakaOfSeries = ctxForAuth.Series.AuthorId == callerId;
        bool isEditorOfSeries = ctxForAuth.Series.EditorId == callerId;
        bool isAdmin = PageAccessService.IsAdmin(caller.Role);

        if (!isAssigner && !isMangakaOfSeries && !isEditorOfSeries && !isAdmin)
        {
            throw new WorkflowForbiddenException("Only the task assigner (mangaka/editor) or admin can initiate payment for this task.");
        }

        // Task must be approved to be paid
        if (task.Status != TaskStatuses.Approved)
        {
            throw new InvalidOperationException("Task must be approved before payment can be initiated.");
        }

        // Check if already paid
        if (task.PaymentStatus == PaymentStatuses.Paid)
        {
            throw new InvalidOperationException("Task has already been paid.");
        }

        var txnRef = $"T{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var orderInfo = $"Pay task {task.Id.ToString("N")[..8]}";
        
        // Use ReturnUrl from request if provided, otherwise use config
        var returnUrl = !string.IsNullOrEmpty(request.ReturnUrl) 
            ? request.ReturnUrl 
            : _vnPayOptions.ReturnUrl;
            
        var paymentUrl = _vnPayService.CreatePaymentUrl(
            task.Price,
            orderInfo,
            returnUrl,    // Backend API endpoint for user redirect
            _vnPayOptions.IpnUrl,    // Backend API endpoint for IPN callback
            txnRef);

        // Store transaction reference in task
        task.VnPayTxnRef = txnRef;
        task.UpdatedAt = DateTime.UtcNow;
        TaskRepository.Update(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CreateTaskPaymentResponse(task.Id, paymentUrl, txnRef, task.PaymentStatus);
    }

    public async Task<TaskPaymentReturnResponse> ProcessPaymentCallbackAsync(
        IReadOnlyDictionary<string, string> queryParams,
        CancellationToken cancellationToken = default)
    {
        // Verify the callback signature
        if (!_vnPayService.VerifyCallback(queryParams))
        {
            return new TaskPaymentReturnResponse(
                null,
                false,
                "Chữ ký không hợp lệ",
                null,
                _vnPayService.GetResponseCode(queryParams),
                _vnPayService.GetTransactionNo(queryParams),
                _vnPayService.GetTxnRef(queryParams));
        }

        var responseCode = _vnPayService.GetResponseCode(queryParams);
        var txnRef = _vnPayService.GetTxnRef(queryParams);
        var transactionNo = _vnPayService.GetTransactionNo(queryParams);

        var task = await TaskRepository.FirstOrDefaultAsync(
            t => t.VnPayTxnRef == txnRef,
            asNoTracking: false,
            cancellationToken);

        // Fall back to parsing payment URLs created with the previous txnRef format.
        Guid? taskId = task?.Id;
        try
        {
            var parts = txnRef.Split('_');
            if (parts.Length >= 2 && Guid.TryParse(parts[1], out var parsedTaskId))
            {
                taskId = parsedTaskId;
            }
        }
        catch
        {
            // Ignore parsing errors
        }

        if (taskId is null)
        {
            return new TaskPaymentReturnResponse(
                null,
                false,
                "Không xác định được task",
                null,
                responseCode,
                transactionNo,
                txnRef);
        }

        task ??= await TaskRepository.GetByIdAsync(taskId.Value, asNoTracking: false, cancellationToken);
        if (task is null)
        {
            return new TaskPaymentReturnResponse(
                taskId,
                false,
                "Không tìm thấy task",
                null,
                responseCode,
                transactionNo,
                txnRef);
        }

        var isSuccess = responseCode == "00";
        string message;
        string? newPaymentStatus = task.PaymentStatus;

        if (isSuccess)
        {
            if (task.PaymentStatus != PaymentStatuses.Paid)
            {
                task.PaymentStatus = PaymentStatuses.Paid;
                task.UpdatedAt = DateTime.UtcNow;
                TaskRepository.Update(task);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                newPaymentStatus = PaymentStatuses.Paid;
            }
            message = "Thanh toán thành công";
        }
        else
        {
            message = GetVnPayErrorMessage(responseCode);
        }

        return new TaskPaymentReturnResponse(
            taskId,
            isSuccess,
            message,
            newPaymentStatus,
            responseCode,
            transactionNo,
            txnRef);
    }

    private static string GetVnPayErrorMessage(string responseCode)
    {
        return responseCode switch
        {
            "00" => "Giao dịch thành công",
            "07" => "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới gian lận, bất thường)",
            "09" => "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking",
            "10" => "Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
            "11" => "Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.",
            "12" => "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.",
            "13" => "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.",
            "24" => "Giao dịch không thành công do: Khách hàng hủy giao dịch",
            "51" => "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.",
            "65" => "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.",
            "75" => "Ngân hàng thanh toán đang bảo trì.",
            "79" => "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch",
            "99" => "Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)",
            _ => $"Lỗi thanh toán (mã: {responseCode})"
        };
    }
}
