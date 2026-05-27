using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Annotations;
using PRN232v1.Services.Annotations;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public class AnnotationsController : ControllerBase
{
    private readonly AnnotationService _annotationService;

    public AnnotationsController(AnnotationService annotationService)
    {
        _annotationService = annotationService;
    }

    [HttpGet("/api/pages/{pageId:guid}/annotations")]
    [SwaggerOperation(Summary = "List page annotations", Description = "Lists annotations on a page when the authenticated user can view that page.")]
    [ProducesResponseType(typeof(IReadOnlyList<AnnotationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AnnotationResponse>>> List(
        Guid pageId,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _annotationService.ListByPageAsync(userId, pageId, cancellationToken));
    }

    [HttpPost("/api/pages/{pageId:guid}/annotations")]
    [SwaggerOperation(Summary = "Create page annotation", Description = "Creates an annotation on a page. Requires mangaka, editor, or admin permission to manage that page.")]
    [ProducesResponseType(typeof(AnnotationResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AnnotationResponse>> Create(
        Guid pageId,
        [FromBody] CreateAnnotationRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var created = await _annotationService.CreateAsync(userId, pageId, request, cancellationToken);
        return CreatedAtAction(nameof(List), new { pageId }, created);
    }

    [HttpPut("/api/annotations/{id:guid}")]
    [SwaggerOperation(Summary = "Update annotation", Description = "Updates an annotation. Allowed for the annotation creator or admin.")]
    [ProducesResponseType(typeof(AnnotationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnnotationResponse>> Update(
        Guid id,
        [FromBody] UpdateAnnotationRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _annotationService.UpdateAsync(userId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("/api/annotations/{id:guid}")]
    [SwaggerOperation(Summary = "Delete annotation", Description = "Deletes an annotation. Allowed for the annotation creator or admin.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var deleted = await _annotationService.DeleteAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
