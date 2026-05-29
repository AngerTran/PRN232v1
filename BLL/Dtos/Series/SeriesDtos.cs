using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Series;

public record SeriesResponse(
    Guid Id,
    string Title,
    string? Description,
    string? Genre,
    string? TargetAudience,
    string? CoverImageUrl,
    Guid AuthorId,
    string? AuthorName,
    Guid? EditorId,
    string? EditorName,
    string Status,
    string? PublishingFrequency,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public record SeriesRankingItemResponse(
    Guid SeriesId,
    string Title,
    string Status,
    int IssueNumber,
    int RankPosition,
    int? VoteCount,
    decimal? PopularityScore,
    DateTime? RankedAt);

public record CreateSeriesRequest(
    [Required, MaxLength(255)] string Title,
    string? Description,
    [MaxLength(100)] string? Genre,
    [MaxLength(100)] string? TargetAudience,
    string? CoverImageUrl,
    [MaxLength(20)] string? PublishingFrequency,
    Guid? EditorId);

public record UpdateSeriesRequest(
    [MaxLength(255)] string? Title,
    string? Description,
    [MaxLength(100)] string? Genre,
    [MaxLength(100)] string? TargetAudience,
    string? CoverImageUrl,
    [MaxLength(20)] string? PublishingFrequency,
    Guid? EditorId);

public record UpdateSeriesStatusRequest(
    [Required, MaxLength(30)] string Status);

public record SeriesListResponse(
    IReadOnlyList<SeriesResponse> Data,
    int Total,
    int Page,
    int Limit);
