using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Board;

public record BoardVoteResponse(
    Guid Id,
    Guid? SeriesId,
    string? SeriesTitle,
    Guid? BoardMemberId,
    string? BoardMemberName,
    string Decision,
    string? Comment,
    DateTime? CreatedAt);

public record CreateBoardVoteRequest(
    [Required] Guid SeriesId,
    [Required] string Decision,
    string? Comment);

public record PendingSeriesItemResponse(
    Guid Id,
    string Title,
    string Status,
    Guid AuthorId,
    string? AuthorName,
    int ApproveVotes,
    int RejectVotes,
    int TotalBoardMembers,
    int VotedBoardMembers,
    DateTime? SubmittedForReviewAt,
    DateTime? ReviewExpiresAt,
    bool CurrentUserHasVoted,
    string? CurrentUserInvitationStatus,
    bool CanVolunteerReview);

public record BoardVoteProgressResponse(
    int TotalBoardMembers,
    int VotedBoardMembers,
    int ApproveVotes,
    int RejectVotes,
    int RequiredVotes,
    bool QuorumMet);

public record LeaderboardItemResponse(
    Guid SeriesId,
    string Title,
    int? LatestRank,
    int TotalVotes,
    decimal PopularityScore);

public record DecideDangerSeriesRequest(
    [Required] string Decision,
    string? Reason);

public record DangerSeriesDecisionResponse(
    Guid SeriesId,
    string Decision,
    string Status,
    string? PublishingFrequency);
