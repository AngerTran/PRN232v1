using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Board;
using BLL.Services.Board;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/board")]
[Authorize]
[Produces("application/json")]
public class BoardController : ControllerBase
{
    private readonly BoardService _boardService;

    public BoardController(BoardService boardService)
    {
        _boardService = boardService;
    }

    [HttpPost("votes")]
    [SwaggerOperation(Summary = "Cast board vote", Description = "Creates or updates a board vote for a series decision. Requires board or admin role.")]
    [ProducesResponseType(typeof(BoardVoteResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BoardVoteResponse>> Vote(
        [FromBody] CreateBoardVoteRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.VoteAsync(userId, request, cancellationToken));
    }

    [HttpGet("votes")]
    [SwaggerOperation(Summary = "List board votes", Description = "Lists board votes, optionally filtered by series ID.")]
    [ProducesResponseType(typeof(IReadOnlyList<BoardVoteResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<BoardVoteResponse>>> ListVotes(
        [FromQuery] Guid? seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.ListVotesAsync(userId, seriesId, cancellationToken));
    }

    [HttpGet("pending-series")]
    [SwaggerOperation(Summary = "List pending series", Description = "Lists series waiting for board review or decision.")]
    [ProducesResponseType(typeof(IReadOnlyList<PendingSeriesItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PendingSeriesItemResponse>>> PendingSeries(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.ListPendingSeriesAsync(userId, cancellationToken));
    }

    [HttpGet("vote-progress")]
    [SwaggerOperation(Summary = "Get board vote progress", Description = "Returns how many board members have voted and whether quorum is met for a series.")]
    [ProducesResponseType(typeof(BoardVoteProgressResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BoardVoteProgressResponse>> VoteProgress(
        [FromQuery] Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.GetVoteProgressAsync(userId, seriesId, cancellationToken));
    }

    [HttpGet("leaderboard")]
    [SwaggerOperation(Summary = "Get leaderboard", Description = "Returns leaderboard metrics for series performance. The metric query controls which ranking signal is used.")]
    [ProducesResponseType(typeof(IReadOnlyList<LeaderboardItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LeaderboardItemResponse>>> Leaderboard(
        [FromQuery] string? metric,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.GetLeaderboardAsync(userId, metric, cancellationToken));
    }
}
