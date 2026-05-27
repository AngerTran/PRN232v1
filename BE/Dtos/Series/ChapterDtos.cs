using System.ComponentModel.DataAnnotations;

namespace PRN232v1.Dtos.Series;

public record ChapterResponse(
    Guid Id,
    Guid SeriesId,
    int ChapterNumber,
    string? Title,
    string? ManuscriptUrl,
    string Status,
    DateTime? Deadline,
    DateTime? ReleaseDate,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public record CreateChapterRequest(
    [Range(1, int.MaxValue)] int ChapterNumber,
    [MaxLength(255)] string? Title,
    string? ManuscriptUrl,
    DateTime? Deadline,
    DateTime? ReleaseDate);

public record UpdateChapterRequest(
    [MaxLength(255)] string? Title,
    string? ManuscriptUrl,
    DateTime? Deadline,
    DateTime? ReleaseDate);

public record UpdateChapterStatusRequest(
    [Required, MaxLength(30)] string Status);
