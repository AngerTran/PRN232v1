using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Pages;
using BLL.Services.Pages;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public class PagesController : ControllerBase
{
    private readonly PageService _pageService;

    public PagesController(PageService pageService)
    {
        _pageService = pageService;
    }

    [HttpGet("/api/chapters/{chapterId:guid}/pages")]
    [SwaggerOperation(Summary = "List chapter pages", Description = "Lists pages in a chapter. Available to studio roles that can view the chapter.")]
    [ProducesResponseType(typeof(IReadOnlyList<PageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PageResponse>>> ListByChapter(
        Guid chapterId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var pages = await _pageService.ListByChapterAsync(userId, chapterId, cancellationToken);
        return pages is null ? NotFound() : Ok(pages);
    }

    [HttpPost("/api/chapters/{chapterId:guid}/pages")]
    [Consumes("multipart/form-data")]
    [SwaggerOperation(Summary = "Upload chapter page", Description = "Uploads a page image and optional thumbnail to storage, then creates a page record. Allowed for mangaka author, assistant, or admin.")]
    [ProducesResponseType(typeof(PageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PageResponse>> Create(
        Guid chapterId,
        IFormFile file,
        [FromForm] int pageNumber,
        [FromForm] int? width,
        [FromForm] int? height,
        IFormFile? thumbnail,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (file.Length == 0)
        {
            return BadRequest(new { message = "Page image file is required." });
        }

        var created = await _pageService.CreateAsync(
            userId,
            chapterId,
            new CreatePageRequest(pageNumber, width, height),
            file,
            thumbnail,
            cancellationToken);

        return created is null
            ? NotFound()
            : CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("/api/chapters/{chapterId:guid}/pages/reorder")]
    [SwaggerOperation(Summary = "Reorder chapter pages", Description = "Sets page numbers according to the given ordered list of page IDs. Allowed for mangaka author, assistant, or admin.")]
    [ProducesResponseType(typeof(IReadOnlyList<PageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PageResponse>>> Reorder(
        Guid chapterId,
        [FromBody] ReorderPagesRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var pages = await _pageService.ReorderAsync(userId, chapterId, request, cancellationToken);
            return pages is null ? NotFound() : Ok(pages);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("/api/pages/{id:guid}")]
    [SwaggerOperation(Summary = "Get page by ID", Description = "Returns page details when the authenticated user can view the page.")]
    [ProducesResponseType(typeof(PageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PageResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var page = await _pageService.GetByIdAsync(userId, id, cancellationToken);
        return page is null ? NotFound() : Ok(page);
    }

    [HttpPut("/api/pages/{id:guid}")]
    [SwaggerOperation(Summary = "Update page", Description = "Updates page metadata such as page number, image URL, thumbnail URL, width, and height. Requires mangaka, assigned editor, or admin permission.")]
    [ProducesResponseType(typeof(PageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PageResponse>> Update(
        Guid id,
        [FromBody] UpdatePageRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _pageService.UpdateAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPut("/api/pages/{id:guid}/status")]
    [SwaggerOperation(Summary = "Update page status", Description = "Changes page workflow status. Requires mangaka, assigned editor, or admin permission.")]
    [ProducesResponseType(typeof(PageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PageResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdatePageStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _pageService.UpdateStatusAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpGet("/api/pages/{id:guid}/versions")]
    [SwaggerOperation(Summary = "List page versions", Description = "Returns page-related submission versions derived from tasks on this page.")]
    [ProducesResponseType(typeof(IReadOnlyList<PageVersionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PageVersionResponse>>> Versions(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var versions = await _pageService.ListVersionsAsync(userId, id, cancellationToken);
        return versions is null ? NotFound() : Ok(versions);
    }

    [HttpDelete("/api/pages/{id:guid}")]
    [SwaggerOperation(Summary = "Delete page", Description = "Deletes a page. Allowed for the mangaka author or admin.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _pageService.DeleteAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
