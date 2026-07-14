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
    [SwaggerOperation(Summary = "Cast board vote", Description = "Creates or updates a board vote for a pending-review series. Requires board role.")]
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
    [SwaggerOperation(
        Summary = "List pending series",
        Description = "Lists all pending-review series for the fixed 3 board members. Auto-heals missing review claims and expires after 48 hours.")]
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

    [HttpGet("in-review-series")]
    [SwaggerOperation(
        Summary = "List in-review series",
        Description = "Lists all pending-review series for the fixed 3 board members (auto-assigned on submit).")]
    [ProducesResponseType(typeof(IReadOnlyList<PendingSeriesItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PendingSeriesItemResponse>>> InReviewSeries(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.ListInReviewSeriesAsync(userId, cancellationToken));
    }

    [HttpPut("series/{seriesId:guid}/lead")]
    [SwaggerOperation(
        Summary = "Assign series lead (admin)",
        Description = "Admin assigns one of the three fixed board reviewers as Lead for the series.")]
    [ProducesResponseType(typeof(BoardReviewClaimResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BoardReviewClaimResponse>> AssignLead(
        Guid seriesId,
        [FromBody] AssignSeriesLeadRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.AssignLeadByAdminAsync(userId, seriesId, request.BoardMemberId, cancellationToken));
    }

    [HttpGet("series/{seriesId:guid}/reviewers")]
    [SwaggerOperation(Summary = "List series board reviewers", Description = "Returns the fixed board reviewers and lead flag for a series.")]
    [ProducesResponseType(typeof(IReadOnlyList<BoardReviewerSummaryItem>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<BoardReviewerSummaryItem>>> ListReviewers(
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.ListSeriesReviewersAsync(userId, seriesId, cancellationToken));
    }

    [HttpGet("vote-progress")]
    [SwaggerOperation(Summary = "Get board vote progress", Description = "Returns vote counts and whether the series has reached the minimum 3 board votes required for a decision.")]
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
    [SwaggerOperation(Summary = "Get leaderboard", Description = "Returns leaderboard metrics for series performance. Optional issueNumber filters to a single release period.")]
    [ProducesResponseType(typeof(IReadOnlyList<LeaderboardItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LeaderboardItemResponse>>> Leaderboard(
        [FromQuery] string? metric,
        [FromQuery] int? issueNumber,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.GetLeaderboardAsync(userId, metric, issueNumber, cancellationToken));
    }

    [HttpPost("danger-series/{seriesId:guid}/decision")]
    [SwaggerOperation(Summary = "Decide danger-zone series", Description = "Continues, changes to monthly, pauses, or cancels a publishing danger-zone series. Requires board role.")]
    [ProducesResponseType(typeof(DangerSeriesDecisionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DangerSeriesDecisionResponse>> DecideDangerSeries(
        Guid seriesId,
        [FromBody] DecideDangerSeriesRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.DecideDangerSeriesAsync(userId, seriesId, request, cancellationToken));
    }
}
