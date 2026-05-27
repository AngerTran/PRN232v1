using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Submissions;
using PRN232v1.Services.Submissions;

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
    [Consumes("multipart/form-data")]
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
