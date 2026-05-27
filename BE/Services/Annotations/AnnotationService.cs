using Microsoft.EntityFrameworkCore;
using PRN232v1.Common;
using PRN232v1.Dtos.Annotations;
using PRN232v1.Models;
using PRN232v1.Repositories;
using PRN232v1.Services.Workflow;

namespace PRN232v1.Services.Annotations;

public class AnnotationService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly PageAccessService _pageAccess;
    private Repository<Annotation> Repository => _unitOfWork.Repository<Annotation>();

    public AnnotationService(UnitOfWork unitOfWork, PageAccessService pageAccess)
    {
        _unitOfWork = unitOfWork;
        _pageAccess = pageAccess;
    }

    public async Task<IReadOnlyList<AnnotationResponse>> ListByPageAsync(
        Guid callerId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var ctx = await _pageAccess.GetPageContextAsync(pageId, cancellationToken);
        if (ctx is null)
        {
            return [];
        }

        if (!await _pageAccess.CanViewPageAsync(caller, ctx, cancellationToken))
        {
            throw new WorkflowForbiddenException("You do not have permission to view annotations on this page.");
        }

        var items = await _unitOfWork.Context.Annotations
            .AsNoTracking()
            .Include(a => a.CreatedByNavigation)
            .Where(a => a.PageId == pageId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(a => Map(a, a.CreatedByNavigation?.FullName)).ToList();
    }

    public async Task<AnnotationResponse> CreateAsync(
        Guid callerId,
        Guid pageId,
        CreateAnnotationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.AnnotationType is not null && !AnnotationTypes.IsValid(request.AnnotationType))
        {
            throw new ArgumentException($"Invalid annotation type. Allowed: {string.Join(", ", AnnotationTypes.All)}.");
        }

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!PageAccessService.IsMangaka(caller.Role) && !PageAccessService.IsEditor(caller.Role) && !PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Only mangaka, editor, or admin can create annotations.");
        }

        var ctx = await _pageAccess.GetPageContextAsync(pageId, cancellationToken)
            ?? throw new WorkflowForbiddenException("Page not found.");

        if (!_pageAccess.CanManageStudio(caller, ctx) && !PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("You do not have permission to annotate this page.");
        }

        var now = DateTime.UtcNow;
        var annotation = new Annotation
        {
            Id = Guid.NewGuid(),
            PageId = pageId,
            CreatedBy = callerId,
            AnnotationType = request.AnnotationType?.Trim(),
            Shape = request.Shape,
            Content = request.Content,
            Color = request.Color,
            CreatedAt = now,
            UpdatedAt = now
        };

        await Repository.AddAsync(annotation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(annotation, caller.FullName);
    }

    public async Task<AnnotationResponse?> UpdateAsync(
        Guid callerId,
        Guid id,
        UpdateAnnotationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.AnnotationType is not null && !AnnotationTypes.IsValid(request.AnnotationType))
        {
            throw new ArgumentException($"Invalid annotation type. Allowed: {string.Join(", ", AnnotationTypes.All)}.");
        }

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var annotation = await Repository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
        if (annotation is null)
        {
            return null;
        }

        if (!CanModifyAnnotation(caller, annotation))
        {
            throw new WorkflowForbiddenException("You do not have permission to update this annotation.");
        }

        if (request.Shape is not null)
        {
            annotation.Shape = request.Shape;
        }

        if (request.AnnotationType is not null)
        {
            annotation.AnnotationType = request.AnnotationType.Trim();
        }

        if (request.Content is not null)
        {
            annotation.Content = request.Content;
        }

        if (request.Color is not null)
        {
            annotation.Color = request.Color;
        }

        annotation.UpdatedAt = DateTime.UtcNow;
        Repository.Update(annotation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var author = annotation.CreatedBy is not null
            ? await _unitOfWork.Repository<Profile>().GetByIdAsync(annotation.CreatedBy.Value, cancellationToken: cancellationToken)
            : null;

        return Map(annotation, author?.FullName);
    }

    public async Task<bool> DeleteAsync(Guid callerId, Guid id, CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var annotation = await Repository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
        if (annotation is null)
        {
            return false;
        }

        if (!CanModifyAnnotation(caller, annotation) && !PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("You do not have permission to delete this annotation.");
        }

        Repository.Remove(annotation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static bool CanModifyAnnotation(Profile caller, Annotation annotation) =>
        annotation.CreatedBy == caller.Id || PageAccessService.IsAdmin(caller.Role);

    private static AnnotationResponse Map(Annotation a, string? createdByName) =>
        new(
            a.Id,
            a.PageId,
            a.CreatedBy,
            createdByName,
            a.AnnotationType,
            a.Shape,
            a.Content,
            a.Color,
            a.CreatedAt,
            a.UpdatedAt);
}
