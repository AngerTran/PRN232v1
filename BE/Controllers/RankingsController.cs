using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Rankings;
using PRN232v1.Services.Rankings;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/rankings")]
[Authorize]
[Produces("application/json")]
public class RankingsController : ControllerBase
{
    private readonly RankingService _rankingService;

    public RankingsController(RankingService rankingService)
    {
        _rankingService = rankingService;
    }

    [HttpPost]
    [SwaggerOperation(Summary = "Create ranking entry", Description = "Creates a ranking snapshot for a series issue. Requires board or admin role.")]
    [ProducesResponseType(typeof(RankingResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<RankingResponse>> Create(
        [FromBody] CreateRankingRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var created = await _rankingService.CreateAsync(userId, request, cancellationToken);
        return CreatedAtAction(nameof(History), new { seriesId = created.SeriesId }, created);
    }

    [HttpGet("history")]
    [SwaggerOperation(Summary = "Get ranking history", Description = "Returns ranking history for a series when the authenticated user can view that ranking data.")]
    [ProducesResponseType(typeof(RankingHistoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RankingHistoryResponse>> History(
        [FromQuery] Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var history = await _rankingService.GetHistoryAsync(userId, seriesId, cancellationToken);
        return history is null ? NotFound() : Ok(history);
    }
}
