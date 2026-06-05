using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using DAL.Services.Workflow;
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
    private Repository<EditorTask> TaskRepository => _unitOfWork.Repository<EditorTask>();
    private Repository<Profile> ProfileRepository => _unitOfWork.Repository<Profile>();

    public TaskService(
        UnitOfWork unitOfWork,
        PageAccessService pageAccess,
        NotificationService notificationService,
        SupabaseStorageService storage,
        IOptions<SupabaseOptions> supabaseOptions)
    {
        _unitOfWork = unitOfWork;
        _pageAccess = pageAccess;
        _notificationService = notificationService;
        _storage = storage;
        _supabaseOptions = supabaseOptions.Value;
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

        if (request.AssignedTo is not null)
        {
            var assignee = await ProfileRepository.GetByIdAsync(request.AssignedTo.Value, cancellationToken: cancellationToken);
            if (assignee is null || assignee.Role != ProfileRole.Assistant)
            {
                throw new ArgumentException("AssignedTo must reference an active assistant profile.");
            }
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
            CreatedAt = now,
            UpdatedAt = now
        };

        await TaskRepository.AddAsync(task, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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
            var assignee = await ProfileRepository.GetByIdAsync(request.AssignedTo.Value, cancellationToken: cancellationToken);
            if (assignee is null || assignee.Role != ProfileRole.Assistant)
            {
                throw new ArgumentException("AssignedTo must reference an assistant profile.");
            }

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

        return await GetByIdAsync(callerId, taskId, cancellationToken);
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

        TaskRepository.Remove(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    internal async Task<EditorTask?> LoadTaskAsync(Guid taskId, CancellationToken cancellationToken) =>
        await _unitOfWork.Context.Tasks
            .Include(t => t.AssignedToNavigation)
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

    private static KanbanColumnItemResponse MapKanbanItem(EditorTask t) =>
        new(t.Id, t.TaskType, t.Status, t.PageId, t.Title, t.AssignedTo);

    private static TaskItemResponse MapTaskItem(EditorTask t, string? assignedToName) =>
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
            t.ResourceUrls);

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
}
