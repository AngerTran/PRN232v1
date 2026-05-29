using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Annotations;

public record AnnotationResponse(
    Guid Id,
    Guid PageId,
    Guid? CreatedBy,
    string? CreatedByName,
    string? AnnotationType,
    string Shape,
    string? Content,
    string? Color,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public record CreateAnnotationRequest(
    [Required] string Shape,
    string? AnnotationType,
    string? Content,
    [MaxLength(20)] string? Color);

public record UpdateAnnotationRequest(
    string? Shape,
    string? AnnotationType,
    string? Content,
    [MaxLength(20)] string? Color);
