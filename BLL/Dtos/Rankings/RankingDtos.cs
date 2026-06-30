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
    string? Notes,
    DateTime? CreatedAt);

public record CreateRankingRequest(
    [Required] Guid SeriesId,
    [Range(1, int.MaxValue)] int IssueNumber,
    [Range(1, int.MaxValue)] int RankPosition,
    int? VoteCount,
    decimal? PopularityScore,
    string? Notes);

public record RankingHistoryResponse(
    Guid SeriesId,
    string? SeriesTitle,
    IReadOnlyList<RankingResponse> Issues);

public record BulkRankingEntryRequest(
    [Required] Guid SeriesId,
    [Range(1, int.MaxValue)] int RankPosition,
    int? VoteCount,
    decimal? PopularityScore,
    string? Notes);

public record BulkCreateRankingRequest(
    [Range(1, int.MaxValue)] int IssueNumber,
    [Required] IReadOnlyList<BulkRankingEntryRequest> Entries);

public record BulkRankingResponse(
    int IssueNumber,
    int SavedCount,
    IReadOnlyList<RankingResponse> Rankings);

public record VoteInputSeriesRowResponse(
    Guid SeriesId,
    string Title,
    string Status,
    int? ExistingRankPosition,
    int? ExistingVoteCount,
    decimal? ExistingPopularityScore,
    string? ExistingNotes,
    int ScheduleCountForIssue);

public record VoteInputContextResponse(
    int SuggestedIssueNumber,
    IReadOnlyList<int> AvailableIssueNumbers,
    IReadOnlyList<VoteInputSeriesRowResponse> Series);
