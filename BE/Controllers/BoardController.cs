using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Board;
using PRN232v1.Services.Board;

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

    [HttpGet("leaderboard")]
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
