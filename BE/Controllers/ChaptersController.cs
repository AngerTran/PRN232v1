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
public class ChaptersController : ControllerBase
{
    private readonly SeriesService _seriesService;

    public ChaptersController(SeriesService seriesService)
    {
        _seriesService = seriesService;
    }

    [HttpGet("{id:guid}")]
    [SwaggerOperation(Summary = "Get chapter by ID", Description = "Returns chapter details when the authenticated user can view the parent series.")]
    [ProducesResponseType(typeof(ChapterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChapterResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var chapter = await _seriesService.GetChapterByIdAsync(userId, id, cancellationToken);
        return chapter is null ? NotFound() : Ok(chapter);
    }

    [HttpPut("{id:guid}")]
    [SwaggerOperation(Summary = "Update chapter", Description = "Updates chapter metadata such as title, manuscript URL, deadline, or release date. Requires permission to modify the parent series.")]
    [ProducesResponseType(typeof(ChapterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChapterResponse>> Update(
        Guid id,
        [FromBody] UpdateChapterRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _seriesService.UpdateChapterAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPut("{id:guid}/status")]
    [SwaggerOperation(Summary = "Update chapter status", Description = "Changes a chapter workflow status according to role rules for admin, board, assigned editor, or author.")]
    [ProducesResponseType(typeof(ChapterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChapterResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateChapterStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _seriesService.UpdateChapterStatusAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id:guid}/manuscript")]
    [Consumes("multipart/form-data")]
    [SwaggerOperation(Summary = "Upload chapter manuscript", Description = "Uploads a manuscript file and stores its public URL on the chapter. Allowed for the series author or admin.")]
    [ProducesResponseType(typeof(ChapterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChapterResponse>> UploadManuscript(
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
            return BadRequest(new { message = "Manuscript file is required." });
        }

        var updated = await _seriesService.UploadChapterManuscriptAsync(userId, id, file, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [SwaggerOperation(Summary = "Delete chapter", Description = "Deletes a chapter. Admin can delete any chapter; mangaka can delete their own draft chapter.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _seriesService.DeleteChapterAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
