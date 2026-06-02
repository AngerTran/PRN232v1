using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Submissions;
using BLL.Services.Submissions;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public class SubmissionsController : ControllerBase
{
    private readonly SubmissionService _submissionService;

    public SubmissionsController(SubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    [HttpGet("/api/tasks/{taskId:guid}/submissions")]
    [SwaggerOperation(Summary = "List task submissions", Description = "Lists submissions for a task. Allowed for the assigned assistant, admin, or users who can manage the related page.")]
    [ProducesResponseType(typeof(IReadOnlyList<SubmissionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SubmissionResponse>>> ListByTask(
        Guid taskId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _submissionService.ListByTaskAsync(userId, taskId, cancellationToken));
    }

    [HttpPost("/api/tasks/{taskId:guid}/submissions")]
    [HttpPost("/api/tasks/{taskId:guid}/submission")]
    [HttpPost("/api/task/{taskId:guid}/submission")]
    [Consumes("multipart/form-data")]
    [SwaggerOperation(Summary = "Submit task work", Description = "Uploads a submission file and optional preview/note for an open task. Requires assistant role and assignment to the task.")]
    [ProducesResponseType(typeof(SubmissionResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<SubmissionResponse>> Create(
        Guid taskId,
        IFormFile file,
        [FromForm] string? note,
        IFormFile? preview,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (file.Length == 0)
        {
            return BadRequest(new { message = "Submission file is required." });
        }

        var created = await _submissionService.CreateAsync(userId, taskId, file, note, preview, cancellationToken);
        return CreatedAtAction(nameof(ListByTask), new { taskId }, created);
    }

    [HttpPatch("/api/submissions/{id:guid}/review")]
    [SwaggerOperation(Summary = "Review submission", Description = "Reviews a submission and updates its review state. Requires mangaka, assigned editor, or admin permission on the related page.")]
    [ProducesResponseType(typeof(SubmissionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SubmissionResponse>> Review(
        Guid id,
        [FromBody] ReviewSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var result = await _submissionService.ReviewAsync(userId, id, request, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("/api/assistants/me/earnings")]
    [SwaggerOperation(Summary = "Get my assistant earnings", Description = "Calculates earnings for the authenticated assistant, optionally filtered by year and month.")]
    [ProducesResponseType(typeof(AssistantEarningsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AssistantEarningsResponse>> Earnings(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _submissionService.GetAssistantEarningsAsync(userId, year, month, cancellationToken));
    }
}
