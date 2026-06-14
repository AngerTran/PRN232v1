using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using DAL.Common;
using BLL.Dtos.Tasks;
using BLL.Services.Tasks;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public class TasksController : ControllerBase
{
    private readonly TaskService _taskService;
    private readonly IConfiguration _configuration;

    public TasksController(TaskService taskService, IConfiguration configuration)
    {
        _taskService = taskService;
        _configuration = configuration;
    }

    [HttpPost("/api/tasks/{id:guid}/payment")]
    [SwaggerOperation(Summary = "Create VNPay payment URL for task", Description = "Creates a payment URL for an approved task. Requires assistant assigned to task or admin/mangaka/editor permission.")]
    [ProducesResponseType(typeof(CreateTaskPaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateTaskPaymentResponse>> CreatePayment(
        Guid id,
        [FromBody] CreateTaskPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var response = await _taskService.CreateTaskPaymentAsync(userId, id, request, cancellationToken);
        if (response is null)
        {
            return NotFound(new { message = "Task not found." });
        }

        return Ok(response);
    }

    [HttpGet("/api/tasks/payment/return")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "VNPay return URL callback", Description = "Handles the return from VNPay after user completes payment. Redirects user to frontend with result.")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> PaymentReturn(
        CancellationToken cancellationToken)
    {
        var queryParams = Request.Query.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        var response = await _taskService.ProcessPaymentCallbackAsync(queryParams, cancellationToken);
        
        // Redirect user to frontend with result
        var frontendUrl = _configuration.GetSection("VnPay").GetValue<string>("FrontendPaymentReturnBaseUrl") 
            ?? "http://localhost:5173/tasks/payment/return";
        
        var redirectUrl = $"{frontendUrl}?taskId={response.TaskId}&success={response.IsSuccess}&message={Uri.EscapeDataString(response.Message)}&responseCode={response.ResponseCode}&txnRef={response.TxnRef}";
        
        return Redirect(redirectUrl);
    }

    [HttpPost("/api/tasks/payment/ipn")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "VNPay IPN (Instant Payment Notification)", Description = "Handles server-to-server IPN from VNPay. This is more reliable than the return URL.")]
    [ProducesResponseType(typeof(TaskPaymentReturnResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TaskPaymentReturnResponse>> PaymentIpn(
        CancellationToken cancellationToken)
    {
        var queryParams = Request.Query.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        var response = await _taskService.ProcessPaymentCallbackAsync(queryParams, cancellationToken);
        return Ok(response);
    }

    [HttpGet("/api/chapters/{chapterId:guid}/kanban")]
    [SwaggerOperation(Summary = "Get chapter kanban", Description = "Returns task columns for a chapter. Access depends on chapter visibility and the caller's role or assignment.")]
    [ProducesResponseType(typeof(KanbanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<KanbanResponse>> Kanban(Guid chapterId, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _taskService.GetKanbanByChapterAsync(userId, chapterId, cancellationToken));
    }

    [HttpGet("/api/tasks/my")]
    [HttpGet("/api/task/my")]
    [SwaggerOperation(Summary = "List my tasks", Description = "Returns tasks assigned to the authenticated assistant.")]
    [ProducesResponseType(typeof(IReadOnlyList<TaskItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TaskItemResponse>>> MyTasks(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _taskService.ListMyTasksAsync(userId, cancellationToken));
    }

    [HttpPost("/api/pages/{pageId:guid}/tasks")]
    [HttpPost("/api/pages/{pageId:guid}/task")]
    [HttpPost("/api/page/{pageId:guid}/task")]
    [SwaggerOperation(Summary = "Create page task", Description = "Creates an editor task for a page. Requires mangaka, assigned editor, or admin permission on the page's series.")]
    [ProducesResponseType(typeof(TaskItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TaskItemResponse>> Create(
        Guid pageId,
        [FromBody] CreateTaskRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var created = await _taskService.CreateAsync(userId, pageId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPost("/api/tasks/{id:guid}/resources")]
    [SwaggerOperation(Summary = "Upload task reference files", Description = "Uploads reference materials for a task. Requires mangaka, assigned editor, or admin permission.")]
    [ProducesResponseType(typeof(TaskItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskItemResponse>> UploadResources(
        Guid id,
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (files is null || files.Count == 0)
        {
            return BadRequest(new { message = "No files provided." });
        }

        var updated = await _taskService.UploadResourcesAsync(userId, id, files, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPatch("/api/tasks/{id:guid}/status_in_progress")]
    [HttpPatch("/api/task/{id:guid}/status_in_progress")]
    [SwaggerOperation(Summary = "Mark task in progress", Description = "Marks an assigned assistant task as in progress.")]
    [ProducesResponseType(typeof(TaskItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskItemResponse>> MarkInProgress(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _taskService.UpdateStatusAsync(userId, id, new UpdateTaskStatusRequest(TaskStatuses.InProgress), cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpGet("/api/tasks/{id:guid}")]
    [SwaggerOperation(Summary = "Get task by ID", Description = "Returns a task when the authenticated user can view the task, assigned page, or related chapter.")]
    [ProducesResponseType(typeof(TaskItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskItemResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var task = await _taskService.GetByIdAsync(userId, id, cancellationToken);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPatch("/api/tasks/{id:guid}/status")]
    [SwaggerOperation(Summary = "Update task status", Description = "Changes task status according to workflow rules for admin, assigned assistant, mangaka, or editor.")]
    [ProducesResponseType(typeof(TaskItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskItemResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateTaskStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _taskService.UpdateStatusAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPut("/api/tasks/{id:guid}")]
    [SwaggerOperation(Summary = "Update task", Description = "Updates task details or assignment. Requires permission to assign tasks for the related page.")]
    [ProducesResponseType(typeof(TaskItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskItemResponse>> Update(
        Guid id,
        [FromBody] UpdateTaskRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _taskService.UpdateAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("/api/tasks/{id:guid}")]
    [SwaggerOperation(Summary = "Delete task", Description = "Deletes a task when the authenticated user is admin or can assign tasks for the related page.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _taskService.DeleteAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
