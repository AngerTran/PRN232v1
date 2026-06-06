using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.ActivityLogs;
using BLL.Services.ActivityLogs;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/activity-logs")]
[Authorize]
[Produces("application/json")]
public class ActivityLogsController : ControllerBase
{
    private readonly ActivityLogService _activityLogService;

    public ActivityLogsController(ActivityLogService activityLogService)
    {
        _activityLogService = activityLogService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ActivityLogListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ActivityLogListResponse>> List(
        [FromQuery] Guid? userId,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] Guid? entityId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        return Ok(await _activityLogService.ListAsync(
            callerId, userId, action, entityType, entityId, from, to, page, limit, cancellationToken));
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(ActivityLogListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActivityLogListResponse>> ListMine(
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        return Ok(await _activityLogService.ListMineAsync(callerId, action, entityType, page, limit, cancellationToken));
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(ActivityLogStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ActivityLogStatsResponse>> Stats(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        return Ok(await _activityLogService.GetStatsAsync(callerId, from, to, cancellationToken));
    }

    [HttpGet("series/{seriesId:guid}")]
    [ProducesResponseType(typeof(ActivityLogListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ActivityLogListResponse>> ListBySeries(
        Guid seriesId,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        return Ok(await _activityLogService.ListBySeriesAsync(callerId, seriesId, page, limit, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ActivityLogResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityLogResponse>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var log = await _activityLogService.GetByIdAsync(callerId, id, cancellationToken);
        return log is null ? NotFound() : Ok(log);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ActivityLogResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ActivityLogResponse>> Create(
        [FromBody] CreateActivityLogRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var created = await _activityLogService.CreateAsync(callerId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
}
