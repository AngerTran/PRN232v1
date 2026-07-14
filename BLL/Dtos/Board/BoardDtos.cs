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
    string? PublishingFrequency,
    DateTime? CreatedAt);

public record CreateBoardVoteRequest(
    [Required] Guid SeriesId,
    [Required] string Decision,
    string? Comment,
    string? PublishingFrequency);

public record ClaimSeriesReviewRequest(bool WantLead = false);

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
    int ClaimedBoardMembers,
    int RequiredClaims,
    DateTime? SubmittedForReviewAt,
    DateTime? ReviewExpiresAt,
    bool CurrentUserHasVoted,
    bool CurrentUserHasClaimed,
    bool CurrentUserIsLead,
    string? CurrentUserInvitationStatus,
    bool CanClaim,
    bool CanClaimAsLead,
    bool ClaimsFull,
    bool HasLead,
    Guid? LeadBoardMemberId,
    string? LeadBoardMemberName,
    bool CanManagePublishingSchedule);

public record BoardVoteProgressResponse(
    int TotalBoardMembers,
    int VotedBoardMembers,
    int ApproveVotes,
    int RejectVotes,
    int RequiredVotes,
    bool QuorumMet,
    int ClaimedBoardMembers,
    int RequiredClaims,
    bool CurrentUserHasClaimed,
    bool CurrentUserIsLead,
    bool CanClaim,
    bool CanClaimAsLead,
    bool ClaimsFull,
    bool HasLead,
    Guid? LeadBoardMemberId,
    string? LeadBoardMemberName,
    bool CanManagePublishingSchedule,
    bool CanVote,
    bool CanClaimLead,
    DateTime? LeadClaimExpiresAt,
    string? SeriesStatus);

public record BoardReviewClaimResponse(
    Guid SeriesId,
    Guid BoardMemberId,
    int ClaimedBoardMembers,
    int RequiredClaims,
    bool ClaimsFull,
    bool IsLead,
    bool HasLead,
    Guid? LeadBoardMemberId,
    string? LeadBoardMemberName,
    DateTime ClaimedAt);

public record BoardReviewerSummaryItem(
    Guid BoardMemberId,
    string BoardMemberName,
    string Source,
    bool IsLead);

public record AssignSeriesLeadRequest(
    [Required] Guid BoardMemberId);

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
