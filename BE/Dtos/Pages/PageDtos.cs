using System.ComponentModel.DataAnnotations;

namespace PRN232v1.Dtos.Pages;

public record PageResponse(
    Guid Id,
    Guid ChapterId,
    int PageNumber,
    string? ImageUrl,
    string? ThumbnailUrl,
    string Status,
    int? Width,
    int? Height,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public record CreatePageRequest(
    [Range(1, int.MaxValue)] int PageNumber,
    int? Width,
    int? Height);

public record UpdatePageRequest(
    [Range(1, int.MaxValue)] int? PageNumber,
    string? ImageUrl,
    string? ThumbnailUrl,
    int? Width,
    int? Height);

public record UpdatePageStatusRequest(
    [Required, MaxLength(30)] string Status);

public record PageVersionResponse(
    Guid SubmissionId,
    Guid TaskId,
    int VersionNumber,
    string? FileUrl,
    string? PreviewImageUrl,
    string Status,
    string? Note,
    DateTime? SubmittedAt);
