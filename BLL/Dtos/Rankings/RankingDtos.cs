using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Rankings;

public record RankingResponse(
    Guid Id,
    Guid SeriesId,
    string? SeriesTitle,
    int IssueNumber,
    int RankPosition,
    int? VoteCount,
    decimal? PopularityScore,
    DateTime? CreatedAt);

public record CreateRankingRequest(
    [Required] Guid SeriesId,
    [Range(1, int.MaxValue)] int IssueNumber,
    [Range(1, int.MaxValue)] int RankPosition,
    int? VoteCount,
    decimal? PopularityScore);

public record RankingHistoryResponse(
    Guid SeriesId,
    string? SeriesTitle,
    IReadOnlyList<RankingResponse> Issues);
