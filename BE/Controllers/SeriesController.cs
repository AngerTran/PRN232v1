using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Series;
using BLL.Services.Series;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class SeriesController : ControllerBase
{
    private readonly SeriesService _seriesService;

    public SeriesController(SeriesService seriesService)
    {
        _seriesService = seriesService;
    }

    [HttpGet("catalog")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Browse public catalog", Description = "Lists publicly visible series with optional genre filtering and pagination. Does not require login.")]
    [ProducesResponseType(typeof(SeriesListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeriesListResponse>> Catalog(
        [FromQuery] string? genre,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _seriesService.ListCatalogAsync(genre, page, limit, cancellationToken));
    }

    [HttpGet]
    [SwaggerOperation(Summary = "List visible series", Description = "Lists series visible to the authenticated user. Staff can see all series; other users see public series and their own authored series.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesResponse>>> List(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListAsync(userId, cancellationToken));
    }

    [HttpGet("my-series")]
    [SwaggerOperation(Summary = "List my authored series", Description = "Lists series authored by the authenticated mangaka. Requires mangaka role.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<SeriesResponse>>> MySeries(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListMySeriesAsync(userId, cancellationToken));
    }

    [HttpGet("ranking")]
    [SwaggerOperation(Summary = "List latest series rankings", Description = "Returns the latest ranking item for each series, ordered by rank position.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesRankingItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesRankingItemResponse>>> Ranking(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.GetRankingAsync(userId, cancellationToken));
    }

    [HttpGet("danger-zone")]
    [SwaggerOperation(Summary = "List danger-zone series", Description = "Returns publishing series whose latest ranking is in the danger zone. Staff can see all; mangaka see only their own.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<SeriesResponse>>> DangerZone(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.GetDangerZoneAsync(userId, cancellationToken));
    }

    [HttpGet("{id:guid}/stats")]
    [SwaggerOperation(Summary = "Get series stats", Description = "Returns chapter count, page count, latest ranking, vote totals, schedule count, and danger-zone state for a visible series.")]
    [ProducesResponseType(typeof(SeriesStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesStatsResponse>> GetStats(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var stats = await _seriesService.GetStatsAsync(userId, id, cancellationToken);
        return stats is null ? NotFound() : Ok(stats);
    }

    [HttpPost("{id:guid}/cover")]
    [Consumes("multipart/form-data")]
    [SwaggerOperation(Summary = "Upload series cover", Description = "Uploads a cover image to Supabase Storage and updates the series cover URL. Requires permission to modify the series.")]
    [ProducesResponseType(typeof(SeriesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesResponse>> UploadCover(
        Guid id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (file.Length == 0)
        {
            return BadRequest(new { message = "Cover image file is required." });
        }

        var updated = await _seriesService.UploadCoverAsync(userId, id, file, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpGet("{id:guid}")]
    [SwaggerOperation(Summary = "Get series by ID", Description = "Returns series details when the authenticated user can view the series.")]
    [ProducesResponseType(typeof(SeriesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var series = await _seriesService.GetByIdAsync(userId, id, cancellationToken);
        return series is null ? NotFound() : Ok(series);
    }

    [HttpPost]
    [SwaggerOperation(Summary = "Create series", Description = "Creates a draft series for the authenticated mangaka or admin. Only admins can assign an editor during creation.")]
    [ProducesResponseType(typeof(SeriesResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SeriesResponse>> Create(
        [FromBody] CreateSeriesRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var created = await _seriesService.CreateAsync(userId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [SwaggerOperation(Summary = "Update series", Description = "Updates series metadata. Allowed for admin, the author, or the assigned editor; editor assignment is admin-only.")]
    [ProducesResponseType(typeof(SeriesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesResponse>> Update(
        Guid id,
        [FromBody] UpdateSeriesRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _seriesService.UpdateAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{seriesId:guid}/editor-invitations")]
    [SwaggerOperation(Summary = "Invite editor", Description = "Mangaka sends an editor invitation for an approved series. Editor must accept before assignment.")]
    [ProducesResponseType(typeof(SeriesEditorInvitationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SeriesEditorInvitationResponse>> InviteEditor(
        Guid seriesId,
        [FromBody] InviteSeriesEditorRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var invitation = await _seriesService.InviteEditorAsync(userId, seriesId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = seriesId }, invitation);
    }

    [HttpGet("editor-invitations/sent")]
    [SwaggerOperation(Summary = "List sent editor invitations", Description = "Lists editor invitations sent by the authenticated mangaka.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesEditorInvitationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesEditorInvitationResponse>>> SentEditorInvitations(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListSentEditorInvitationsAsync(userId, cancellationToken));
    }

    [HttpGet("editor-invitations/mine")]
    [SwaggerOperation(Summary = "List my editor invitations", Description = "Lists editor invitations received by the authenticated editor.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesEditorInvitationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesEditorInvitationResponse>>> MyEditorInvitations(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListMyEditorInvitationsAsync(userId, cancellationToken));
    }

    [HttpPatch("editor-invitations/{seriesId:guid}/{action}")]
    [SwaggerOperation(Summary = "Respond to editor invitation", Description = "Editor accepts or rejects a series assignment invitation.")]
    [ProducesResponseType(typeof(SeriesEditorInvitationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesEditorInvitationResponse>> RespondEditorInvitation(
        Guid seriesId,
        string action,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (action is not ("accept" or "reject"))
        {
            return BadRequest("Action must be 'accept' or 'reject'.");
        }

        var invitation = await _seriesService.RespondToEditorInvitationAsync(
            userId,
            seriesId,
            action == "accept",
            cancellationToken);
        return invitation is null ? NotFound() : Ok(invitation);
    }

    [HttpPost("{seriesId:guid}/board-review-invitations")]
    [SwaggerOperation(Summary = "Invite board member", Description = "Mangaka invites a board member to review a pending series.")]
    [ProducesResponseType(typeof(SeriesBoardReviewInvitationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SeriesBoardReviewInvitationResponse>> InviteBoardMember(
        Guid seriesId,
        [FromBody] InviteSeriesBoardMemberRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var invitation = await _seriesService.InviteBoardMemberAsync(userId, seriesId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = seriesId }, invitation);
    }

    [HttpGet("board-review-invitations/sent")]
    [SwaggerOperation(Summary = "List sent board review invitations", Description = "Lists board review invitations sent by the authenticated mangaka.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesBoardReviewInvitationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesBoardReviewInvitationResponse>>> SentBoardReviewInvitations(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListSentBoardReviewInvitationsAsync(userId, cancellationToken));
    }

    [HttpGet("{seriesId:guid}/board-review-invitations")]
    [SwaggerOperation(Summary = "List board review invitations for series", Description = "Lists board review invitations for a specific series.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesBoardReviewInvitationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesBoardReviewInvitationResponse>>> BoardReviewInvitationsForSeries(
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListBoardReviewInvitationsForSeriesAsync(userId, seriesId, cancellationToken));
    }

    [HttpGet("board-review-invitations/mine")]
    [SwaggerOperation(Summary = "List my board review invitations", Description = "Lists board review invitations received by the authenticated board member.")]
    [ProducesResponseType(typeof(IReadOnlyList<SeriesBoardReviewInvitationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SeriesBoardReviewInvitationResponse>>> MyBoardReviewInvitations(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _seriesService.ListMyBoardReviewInvitationsAsync(userId, cancellationToken));
    }

    [HttpGet("{seriesId:guid}/board-review-status")]
    [SwaggerOperation(Summary = "Get board review status", Description = "Returns vote progress, invite slots, and review expiry for a series.")]
    [ProducesResponseType(typeof(SeriesBoardReviewStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesBoardReviewStatusResponse>> BoardReviewStatus(
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var status = await _seriesService.GetBoardReviewStatusAsync(userId, seriesId, cancellationToken);
        return status is null ? NotFound() : Ok(status);
    }

    [HttpPatch("board-review-invitations/{seriesId:guid}/{action}")]
    [SwaggerOperation(Summary = "Respond to board review invitation", Description = "Board member accepts or rejects a series review invitation.")]
    [ProducesResponseType(typeof(SeriesBoardReviewInvitationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesBoardReviewInvitationResponse>> RespondBoardReviewInvitation(
        Guid seriesId,
        string action,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (action is not ("accept" or "reject"))
        {
            return BadRequest("Action must be 'accept' or 'reject'.");
        }

        var invitation = await _seriesService.RespondToBoardReviewInvitationAsync(
            userId,
            seriesId,
            action == "accept",
            cancellationToken);
        return invitation is null ? NotFound() : Ok(invitation);
    }

    [HttpPut("{id:guid}/status")]
    [SwaggerOperation(Summary = "Update series status", Description = "Changes series workflow status according to role rules for admin, board, assigned editor, or author.")]
    [ProducesResponseType(typeof(SeriesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SeriesResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateSeriesStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _seriesService.UpdateStatusAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [SwaggerOperation(Summary = "Delete series", Description = "Deletes a series. Admin can delete any series; mangaka can delete their own draft series.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _seriesService.DeleteAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("{seriesId:guid}/chapters")]
    [SwaggerOperation(Summary = "List series chapters", Description = "Lists chapters for a series when the authenticated user can view that series.")]
    [ProducesResponseType(typeof(IReadOnlyList<ChapterResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ChapterResponse>>> ListChapters(
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var chapters = await _seriesService.ListChaptersAsync(userId, seriesId, cancellationToken);
        return chapters is null ? NotFound() : Ok(chapters);
    }

    [HttpPost("{seriesId:guid}/chapters")]
    [SwaggerOperation(Summary = "Create chapter", Description = "Creates a draft chapter in a series. Allowed for admin or the mangaka author of that series.")]
    [ProducesResponseType(typeof(ChapterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChapterResponse>> CreateChapter(
        Guid seriesId,
        [FromBody] CreateChapterRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var chapter = await _seriesService.CreateChapterAsync(userId, seriesId, request, cancellationToken);
        return chapter is null ? NotFound() : CreatedAtAction(nameof(ListChapters), new { seriesId }, chapter);
    }
}
