using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using DAL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Services.Storage;
using BLL.Services.Tasks;
using BLL.Configuration;
using BLL.Dtos.Submissions;
using Microsoft.AspNetCore.Http;


namespace BLL.Services.Submissions;

public class SubmissionService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly PageAccessService _pageAccess;
    private readonly TaskService _taskService;
    private readonly SupabaseStorageService _storage;
    private readonly SupabaseOptions _supabaseOptions;
    private Repository<Submission> SubmissionRepository => _unitOfWork.Repository<Submission>();
    private Repository<EditorTask> TaskRepository => _unitOfWork.Repository<EditorTask>();

    public SubmissionService(
        UnitOfWork unitOfWork,
        PageAccessService pageAccess,
        TaskService taskService,
        SupabaseStorageService storage,
        IOptions<SupabaseOptions> supabaseOptions)
    {
        _unitOfWork = unitOfWork;
        _pageAccess = pageAccess;
        _taskService = taskService;
        _storage = storage;
        _supabaseOptions = supabaseOptions.Value;
    }

    public async Task<IReadOnlyList<SubmissionResponse>> ListByTaskAsync(
        Guid callerId,
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        var task = await _taskService.LoadTaskAsync(taskId, cancellationToken);
        if (task is null)
        {
            return [];
        }

        await EnsureCanViewTaskSubmissionsAsync(callerId, task, cancellationToken);

        var items = await _unitOfWork.Context.Submissions
            .AsNoTracking()
            .Include(s => s.Assistant)
            .Include(s => s.ReviewedByNavigation)
            .Where(s => s.TaskId == taskId)
            .OrderByDescending(s => s.VersionNumber)
            .ToListAsync(cancellationToken);

        return items
            .Select(s => MapSubmission(s, s.Assistant?.FullName, s.ReviewedByNavigation?.FullName))
            .ToList();
    }

    public async Task<SubmissionResponse> CreateAsync(
        Guid callerId,
        Guid taskId,
        IFormFile file,
        string? note,
        IFormFile? preview,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!PageAccessService.IsAssistant(caller.Role))
        {
            throw new WorkflowForbiddenException("Only assistants can submit work.");
        }

        var task = await TaskRepository.GetByIdAsync(taskId, asNoTracking: false, cancellationToken)
            ?? throw new WorkflowForbiddenException("Task not found.");

        if (task.AssignedTo != callerId)
        {
            throw new WorkflowForbiddenException("You are not assigned to this task.");
        }

        if (task.Status is not TaskStatuses.Todo and not TaskStatuses.InProgress and not TaskStatuses.Rejected)
        {
            throw new WorkflowForbiddenException("Task is not open for submission.");
        }

        var maxVersion = await _unitOfWork.Context.Submissions
            .Where(s => s.TaskId == taskId)
            .MaxAsync(s => (int?)s.VersionNumber, cancellationToken) ?? 0;

        var version = maxVersion + 1;
        var objectPath = $"tasks/{taskId}/v{version}/{file.FileName}";
        var fileUrl = await _storage.UploadAsync(_supabaseOptions.SubmissionsBucket, objectPath, file, cancellationToken);

        string? previewUrl = null;
        if (preview is not null && preview.Length > 0)
        {
            var previewPath = $"tasks/{taskId}/v{version}/preview_{preview.FileName}";
            previewUrl = await _storage.UploadAsync(_supabaseOptions.SubmissionsBucket, previewPath, preview, cancellationToken);
        }

        var now = DateTime.UtcNow;
        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            AssistantId = callerId,
            VersionNumber = version,
            FileUrl = fileUrl,
            PreviewImageUrl = previewUrl,
            Note = note,
            Status = TaskStatuses.Submitted,
            SubmittedAt = now
        };

        task.Status = TaskStatuses.Submitted;
        task.UpdatedAt = now;
        TaskRepository.Update(task);

        await SubmissionRepository.AddAsync(submission, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapSubmission(submission, caller.FullName, null);
    }

    public async Task<SubmissionResponse?> ReviewAsync(
        Guid callerId,
        Guid submissionId,
        ReviewSubmissionRequest request,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var submission = await SubmissionRepository.GetByIdAsync(submissionId, asNoTracking: false, cancellationToken);
        if (submission is null)
        {
            return null;
        }

        var task = await TaskRepository.GetByIdAsync(submission.TaskId, asNoTracking: false, cancellationToken)
            ?? throw new WorkflowForbiddenException("Task not found.");

        var ctx = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");

        if (!_pageAccess.CanManageStudio(caller, ctx) && !PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Only mangaka, editor, or admin can review submissions.");
        }

        if (submission.Status != TaskStatuses.Submitted)
        {
            throw new ArgumentException("Only submitted work can be reviewed.");
        }

        var now = DateTime.UtcNow;
        submission.Status = request.Approve ? TaskStatuses.Approved : TaskStatuses.Rejected;
        submission.ReviewedBy = callerId;
        submission.ReviewedAt = now;
        if (!string.IsNullOrWhiteSpace(request.Note))
        {
            submission.Note = request.Note;
        }

        task.Status = submission.Status;
        task.CompletedAt = now;
        task.UpdatedAt = now;

        SubmissionRepository.Update(submission);
        TaskRepository.Update(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var assistant = submission.AssistantId is not null
            ? await _unitOfWork.Repository<Profile>().GetByIdAsync(submission.AssistantId.Value, cancellationToken: cancellationToken)
            : null;

        return MapSubmission(submission, assistant?.FullName, caller.FullName);
    }

    public async Task<AssistantEarningsResponse> GetAssistantEarningsAsync(
        Guid callerId,
        int? year,
        int? month,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!PageAccessService.IsAssistant(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires assistant role.");
        }

        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        var start = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var approved = await _unitOfWork.Context.Submissions
            .AsNoTracking()
            .Where(s => s.AssistantId == callerId
                && s.Status == TaskStatuses.Approved
                && s.ReviewedAt >= start
                && s.ReviewedAt < end)
            .ToListAsync(cancellationToken);

        var taskIds = approved.Select(s => s.TaskId).Distinct().ToList();
        var pageCount = await _unitOfWork.Context.Tasks
            .AsNoTracking()
            .Where(t => taskIds.Contains(t.Id))
            .Select(t => t.PageId)
            .Distinct()
            .CountAsync(cancellationToken);

        return new AssistantEarningsResponse(
            approved.Count,
            pageCount,
            $"{y:D4}-{m:D2}");
    }

    private async Task EnsureCanViewTaskSubmissionsAsync(Guid callerId, EditorTask task, CancellationToken cancellationToken)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (task.AssignedTo == callerId || PageAccessService.IsAdmin(caller.Role))
        {
            return;
        }

        var ctx = await _pageAccess.GetPageContextAsync(task.PageId, cancellationToken);
        if (ctx is not null && _pageAccess.CanManageStudio(caller, ctx))
        {
            return;
        }

        throw new WorkflowForbiddenException("You do not have permission to view submissions for this task.");
    }

    private static SubmissionResponse MapSubmission(Submission s, string? assistantName, string? reviewedByName) =>
        new(
            s.Id,
            s.TaskId,
            s.AssistantId,
            assistantName,
            s.VersionNumber ?? 1,
            s.FileUrl,
            s.PreviewImageUrl,
            s.Note,
            s.Status,
            s.ReviewedBy,
            reviewedByName,
            s.ReviewedAt,
            s.SubmittedAt);
}
