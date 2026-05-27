using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Schedules;
using PRN232v1.Services.Schedules;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public class PublishingSchedulesController : ControllerBase
{
    private readonly PublishingScheduleService _scheduleService;

    public PublishingSchedulesController(PublishingScheduleService scheduleService)
    {
        _scheduleService = scheduleService;
    }

    [HttpGet("/api/series/{seriesId:guid}/schedules")]
    [SwaggerOperation(Summary = "List series schedules", Description = "Lists publishing schedules for a series. Allowed for admin, board, author, or assigned editor.")]
    [ProducesResponseType(typeof(IReadOnlyList<PublishingScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PublishingScheduleResponse>>> ListBySeries(
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _scheduleService.ListBySeriesAsync(userId, seriesId, cancellationToken));
    }

    [HttpPost("/api/series/{seriesId:guid}/schedules")]
    [SwaggerOperation(Summary = "Create series schedule", Description = "Creates a publishing schedule for a series. Requires board, assigned editor, or admin role.")]
    [ProducesResponseType(typeof(PublishingScheduleResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<PublishingScheduleResponse>> Create(
        Guid seriesId,
        [FromBody] CreatePublishingScheduleRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var created = await _scheduleService.CreateAsync(userId, seriesId, request, cancellationToken);
        return CreatedAtAction(nameof(ListBySeries), new { seriesId }, created);
    }

    [HttpPut("/api/schedules/{id:guid}")]
    [SwaggerOperation(Summary = "Update schedule", Description = "Updates a publishing schedule. Requires permission to manage schedules for the related series.")]
    [ProducesResponseType(typeof(PublishingScheduleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublishingScheduleResponse>> Update(
        Guid id,
        [FromBody] UpdatePublishingScheduleRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _scheduleService.UpdateAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("/api/schedules/{id:guid}")]
    [SwaggerOperation(Summary = "Delete schedule", Description = "Deletes a publishing schedule. Requires admin role.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _scheduleService.DeleteAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
