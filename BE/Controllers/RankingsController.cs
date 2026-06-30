using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Rankings;
using BLL.Services.Rankings;
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
    [SwaggerOperation(Summary = "Create ranking entry", Description = "Creates or updates a ranking snapshot for a series issue. Requires board or admin role.")]
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

    [HttpPost("bulk")]
    [SwaggerOperation(Summary = "Bulk save rankings for an issue", Description = "Creates or updates multiple ranking rows for the same issue number.")]
    [ProducesResponseType(typeof(BulkRankingResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BulkRankingResponse>> BulkCreate(
        [FromBody] BulkCreateRankingRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _rankingService.BulkCreateAsync(userId, request, cancellationToken));
    }

    [HttpGet("issues")]
    [SwaggerOperation(Summary = "List ranking issue numbers", Description = "Returns issue numbers from rankings and publishing schedules.")]
    [ProducesResponseType(typeof(IReadOnlyList<int>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<int>>> Issues(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _rankingService.ListIssueNumbersAsync(userId, cancellationToken));
    }

    [HttpGet("vote-input")]
    [SwaggerOperation(Summary = "Vote input context", Description = "Returns publishing series rows and existing rankings for an issue.")]
    [ProducesResponseType(typeof(VoteInputContextResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<VoteInputContextResponse>> VoteInput(
        [FromQuery] int? issueNumber,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _rankingService.GetVoteInputContextAsync(userId, issueNumber, cancellationToken));
    }

    [HttpGet("recent-inputs")]
    [SwaggerOperation(Summary = "Recent ranking inputs", Description = "Returns the most recent ranking rows entered by the board.")]
    [ProducesResponseType(typeof(IReadOnlyList<RankingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RankingResponse>>> RecentInputs(
        [FromQuery] int limit = 40,
        CancellationToken cancellationToken = default)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _rankingService.GetRecentInputsAsync(userId, limit, cancellationToken));
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
