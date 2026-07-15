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

    [HttpGet("leads")]
    [SwaggerOperation(
        Summary = "List board lead titles",
        Description = "Returns all board members who have the Board Lead job title (can be many).")]
    [ProducesResponseType(typeof(IReadOnlyList<GlobalBoardLeadResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<GlobalBoardLeadResponse>>> ListLeads(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.ListBoardLeadsAsync(userId, cancellationToken));
    }

    [HttpGet("global-lead")]
    [SwaggerOperation(
        Summary = "Get one board lead (compat)",
        Description = "Returns the first Board Lead by name, or 204 if none. Prefer GET /api/board/leads.")]
    [ProducesResponseType(typeof(GlobalBoardLeadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult<GlobalBoardLeadResponse>> GetGlobalLead(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var lead = await _boardService.GetGlobalBoardLeadAsync(userId, cancellationToken);
        return lead is null ? NoContent() : Ok(lead);
    }

    [HttpPut("leads")]
    [HttpPut("global-lead")]
    [SwaggerOperation(
        Summary = "Grant Board Lead title (admin)",
        Description = "Marks a board account as Lead title. Multiple Leads are allowed. Does not demote other Leads.")]
    [ProducesResponseType(typeof(GlobalBoardLeadResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<GlobalBoardLeadResponse>> AssignLeadTitle(
        [FromBody] AssignGlobalBoardLeadRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.AssignGlobalBoardLeadAsync(userId, request.BoardMemberId, cancellationToken));
    }

    [HttpDelete("leads/{boardMemberId:guid}")]
    [SwaggerOperation(
        Summary = "Revoke Board Lead title (admin)",
        Description = "Removes Lead title from one board account. Other Leads are unchanged.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearLeadTitle(Guid boardMemberId, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        await _boardService.ClearBoardLeadRoleAsync(userId, boardMemberId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("global-lead")]
    [SwaggerOperation(
        Summary = "Clear all Board Lead titles (admin)",
        Description = "Removes Lead title from every board account.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearAllLeadTitles(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        await _boardService.ClearGlobalBoardLeadAsync(userId, cancellationToken);
        return NoContent();
    }

    [HttpPut("series/{seriesId:guid}/editor")]
    [SwaggerOperation(
        Summary = "Assign series editor",
        Description = "Board or Admin assigns exactly one editor to supervise production on an approved series.")]
    [ProducesResponseType(typeof(SeriesEditorAssignmentResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeriesEditorAssignmentResponse>> AssignSeriesEditor(
        Guid seriesId,
        [FromBody] AssignSeriesEditorRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _boardService.AssignSeriesEditorAsync(userId, seriesId, request.EditorId, cancellationToken));
    }

    [HttpDelete("series/{seriesId:guid}/editor")]
    [SwaggerOperation(
        Summary = "Clear series editor",
        Description = "Board or Admin removes the assigned editor from a series.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearSeriesEditor(
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        await _boardService.ClearSeriesEditorAsync(userId, seriesId, cancellationToken);
        return NoContent();
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
