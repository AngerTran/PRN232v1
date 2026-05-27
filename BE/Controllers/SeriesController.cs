using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Series;
using PRN232v1.Services.Series;

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

    [HttpPut("{id:guid}/status")]
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
