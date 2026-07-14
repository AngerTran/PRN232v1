using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Dtos.Board;
using BLL.Services.Notifications;
using BLL.Common;

namespace BLL.Services.Board;

public class BoardService
{
    public const int MinimumBoardVotesForDecision = SeriesReviewRules.MinimumReviewDecisions;
    public const int ReviewExpiryHours = SeriesReviewRules.ReviewExpiryHours;
    public const int ReviewExpiryDays = SeriesReviewRules.ReviewExpiryDays;
    public const int MaxReviewClaims = SeriesReviewRules.MaxActiveReviewSlots;
    public const int LeadClaimExpiryDays = SeriesReviewRules.LeadClaimExpiryDays;

    private const int DangerRankPositionThreshold = 30;
    private static readonly IReadOnlySet<string> DangerDecisions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "continue",
        "monthly",
        "hiatus",
        "cancel"
    };

    private readonly UnitOfWork _unitOfWork;
    private readonly NotificationService _notificationService;
    private Repository<BoardVote> VoteRepository => _unitOfWork.Repository<BoardVote>();
    private Repository<DAL.Models.Series> SeriesRepository => _unitOfWork.Repository<DAL.Models.Series>();
    private Repository<ActivityLog> ActivityLogRepository => _unitOfWork.Repository<ActivityLog>();

    public BoardService(UnitOfWork unitOfWork, NotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task ExpireStalePendingReviewsAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-ReviewExpiryHours);
        var expired = await _unitOfWork.Context.Series
            .AsNoTracking()
            .Where(s => s.Status == SeriesStatus.PendingReview
                && s.SubmittedForReviewAt != null
                && s.SubmittedForReviewAt < cutoff)
            .Select(s => new { s.Id, s.Title, s.AuthorId })
            .ToListAsync(cancellationToken);

        if (expired.Count == 0)
        {
            return;
        }

        foreach (var item in expired)
        {
            var series = await SeriesRepository.GetByIdAsync(item.Id, asNoTracking: false, cancellationToken);
            if (series is null || series.Status != SeriesStatus.PendingReview)
            {
                continue;
            }

            series.Status = SeriesStatus.Cancelled;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);

            await _notificationService.CreateAsync(
                item.AuthorId,
                "Series hết hạn xét duyệt",
                $"Series \"{item.Title}\" đã hết hạn {ReviewExpiryHours} giờ chờ xét duyệt. Bạn có thể chỉnh sửa và gửi lại.",
                WorkflowNotificationPaths.MangakaSeries(item.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task RecordInvitationDecisionAsync(
        Guid seriesId,
        Guid boardMemberId,
        bool accept,
        CancellationToken cancellationToken = default)
    {
        var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Series not found.");

        if (series.Status != SeriesStatus.PendingReview)
        {
            return;
        }

        if (accept)
        {
            await EnsureReviewClaimAsync(seriesId, boardMemberId, "invitation", cancellationToken);
        }

        var decision = accept ? VoteDecisions.Approve : VoteDecisions.Reject;
        await UpsertBoardVoteAsync(seriesId, boardMemberId, decision, null, null, cancellationToken);
        // Persist vote trước khi đếm quorum — GetBoardVotes dùng AsNoTracking nên không thấy entity chưa save.
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await TryAutoUpdateSeriesStatusAsync(series, seriesId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (accept)
        {
            var claims = await LoadSeriesClaimsAsync(seriesId, cancellationToken);
            var claimant = await _unitOfWork.Repository<Profile>()
                .GetByIdAsync(boardMemberId, cancellationToken: cancellationToken);
            if (claimant is not null)
            {
                await NotifyAfterReviewClaimAsync(series, claimant, claims, fromPublicClaim: false, cancellationToken);
            }
        }
    }

    public async Task<BoardVoteResponse> VoteAsync(
        Guid callerId,
        CreateBoardVoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!VoteDecisions.IsValid(request.Decision))
        {
            throw new ArgumentException($"Invalid decision. Allowed: {string.Join(", ", VoteDecisions.All)}.");
        }

        var caller = await RequireBoardMemberAsync(callerId, allowAdmin: false, cancellationToken);
        var series = await SeriesRepository.GetByIdAsync(request.SeriesId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Series not found.");

        if (series.Status != SeriesStatus.PendingReview)
        {
            throw new WorkflowForbiddenException("Only series pending board review can receive votes.");
        }

        var hasClaim = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == request.SeriesId && c.BoardMemberId == callerId, cancellationToken);
        if (!hasClaim)
        {
            throw new WorkflowForbiddenException("Bạn không thuộc nhóm 3 board được gán xét duyệt series này.");
        }

        var existing = await _unitOfWork.Context.BoardVotes
            .FirstOrDefaultAsync(
                v => v.SeriesId == request.SeriesId && v.BoardMemberId == callerId,
                cancellationToken);

        var decision = request.Decision.Trim();
        // Hình thức xuất bản không chọn lúc vote — Lead chọn khi series hoàn thành / lên lịch.
        PublishingFrequency? voteFrequency = null;

        if (existing is not null)
        {
            existing.Decision = decision;
            existing.Comment = request.Comment;
            existing.PublishingFrequency = voteFrequency;
            VoteRepository.Update(existing);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await TryAutoUpdateSeriesStatusAsync(series, request.SeriesId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return MapVote(existing, series.Title, caller.FullName);
        }

        await UpsertBoardVoteAsync(request.SeriesId, callerId, decision, request.Comment, voteFrequency, cancellationToken);
        // Persist vote trước khi đếm quorum — GetBoardVotes dùng AsNoTracking nên không thấy entity chưa save.
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await TryAutoUpdateSeriesStatusAsync(series, request.SeriesId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var vote = await _unitOfWork.Context.BoardVotes
            .FirstAsync(v => v.SeriesId == request.SeriesId && v.BoardMemberId == callerId, cancellationToken);
        return MapVote(vote, series.Title, caller.FullName);
    }

    public async Task<IReadOnlyList<BoardVoteResponse>> ListVotesAsync(
        Guid callerId,
        Guid? seriesId,
        CancellationToken cancellationToken = default)
    {
        var caller = await RequireBoardMemberAsync(callerId, allowAdmin: true, cancellationToken);

        var query = _unitOfWork.Context.BoardVotes
            .AsNoTracking()
            .Include(v => v.Series)
            .Include(v => v.BoardMember)
            .AsQueryable();

        if (seriesId is not null)
        {
            query = query.Where(v => v.SeriesId == seriesId);
        }

        var votes = await query.OrderByDescending(v => v.CreatedAt).ToListAsync(cancellationToken);
        var mapped = votes.Select(v => MapVote(v, v.Series?.Title, v.BoardMember?.FullName)).ToList();

        // Admin luôn xem đủ. Vote ẩn chỉ áp khi lọc theo 1 series đang pending_review.
        if (seriesId is null || PageAccessService.IsAdmin(caller.Role))
        {
            return mapped;
        }

        var series = await SeriesRepository.GetByIdAsync(seriesId.Value, cancellationToken: cancellationToken);
        if (series is null || series.Status != SeriesStatus.PendingReview)
        {
            return mapped;
        }

        var distinctVoters = votes
            .Where(v => v.BoardMemberId is not null)
            .Select(v => v.BoardMemberId!.Value)
            .Distinct()
            .ToList();
        var votedCount = distinctVoters.Count;
        var callerHasVoted = distinctVoters.Contains(callerId);

        // Đủ 3 phiếu → mọi board xem đầy đủ.
        if (votedCount >= MinimumBoardVotesForDecision)
        {
            return mapped;
        }

        // Người thứ 3 (chưa vote, đã có ≥2 phiếu) được xem đủ để quyết định cuối.
        if (votedCount >= 2 && !callerHasVoted)
        {
            return mapped;
        }

        // Ẩn decision/comment của người khác (vẫn hiện đã bỏ phiếu / tên nếu cần).
        return mapped.Select(v =>
            v.BoardMemberId == callerId
                ? v
                : v with { Decision = "hidden", Comment = null, PublishingFrequency = null }).ToList();
    }

    public async Task<IReadOnlyList<PendingSeriesItemResponse>> ListPendingSeriesAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);
        await ExpireStalePendingReviewsAsync(cancellationToken);
        await HealPendingReviewSeriesAsync(cancellationToken);

        return await LoadPendingSeriesItemsAsync(callerId, cancellationToken);
    }

    public async Task<IReadOnlyList<PendingSeriesItemResponse>> ListInReviewSeriesAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        // Cùng danh sách Duyệt Series — mọi pending đã auto-gán 3 board cố định.
        return await ListPendingSeriesAsync(callerId, cancellationToken);
    }

    private async Task HealPendingReviewSeriesAsync(CancellationToken cancellationToken)
    {
        var pendingTracked = await _unitOfWork.Context.Series
            .Where(s => s.Status == SeriesStatus.PendingReview)
            .ToListAsync(cancellationToken);

        foreach (var series in pendingTracked)
        {
            try
            {
                await TryAutoUpdateSeriesStatusAsync(series, series.Id, cancellationToken);
                if (series.Status == SeriesStatus.PendingReview)
                {
                    await EnsureFixedBoardClaimsIfMissingAsync(series, cancellationToken);
                }

                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                // Không để 1 series lỗi (log/notify) làm sập cả danh sách Duyệt Series.
                foreach (var entry in _unitOfWork.Context.ChangeTracker.Entries()
                             .Where(e => e.Entity == series ||
                                         (e.Entity is ActivityLog log && log.EntityId == series.Id))
                             .ToList())
                {
                    entry.State = EntityState.Detached;
                }
            }
        }
    }

    private async Task<IReadOnlyList<PendingSeriesItemResponse>> LoadPendingSeriesItemsAsync(
        Guid callerId,
        CancellationToken cancellationToken)
    {
        var pending = await _unitOfWork.Context.Series
            .AsNoTracking()
            .Include(s => s.Author)
            .Where(s => s.Status == SeriesStatus.PendingReview)
            .OrderByDescending(s => s.SubmittedForReviewAt)
            .ToListAsync(cancellationToken);

        var seriesIds = pending.Select(s => s.Id).ToList();
        var boardMemberIds = await GetActiveBoardMemberIdsAsync(cancellationToken);
        var votes = seriesIds.Count == 0
            ? new List<BoardVote>()
            : await _unitOfWork.Context.BoardVotes
                .AsNoTracking()
                .Where(v => v.SeriesId != null && seriesIds.Contains(v.SeriesId.Value))
                .ToListAsync(cancellationToken);
        var invitations = seriesIds.Count == 0
            ? new List<SeriesBoardReviewInvitation>()
            : await _unitOfWork.Context.SeriesBoardReviewInvitations
                .AsNoTracking()
                .Where(i => seriesIds.Contains(i.SeriesId))
                .ToListAsync(cancellationToken);
        var claims = seriesIds.Count == 0
            ? new List<SeriesBoardReviewClaim>()
            : await _unitOfWork.Context.SeriesBoardReviewClaims
                .AsNoTracking()
                .Include(c => c.BoardMember)
                .Where(c => seriesIds.Contains(c.SeriesId))
                .ToListAsync(cancellationToken);

        return pending
            .Select(s => MapPendingSeriesItem(s, votes, invitations, claims, boardMemberIds, callerId))
            .ToList();
    }

    public async Task<BoardReviewClaimResponse> ClaimReviewAsync(
        Guid callerId,
        Guid seriesId,
        bool wantLead,
        CancellationToken cancellationToken = default)
    {
        throw new WorkflowForbiddenException(
            "Không cần nhận series — 3 board cố định được gán tự động khi mangaka nộp duyệt.");
    }

    public async Task<BoardVoteProgressResponse> GetVoteProgressAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        // Heal series đã đủ phiếu nhưng kẹt pending_review (bug cũ: vote chưa save trước khi đếm quorum).
        var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken);
        if (series is not null && series.Status == SeriesStatus.PendingReview)
        {
            await TryAutoUpdateSeriesStatusAsync(series, seriesId, cancellationToken);
            await EnsureFixedBoardClaimsIfMissingAsync(series, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var boardMemberIds = await GetActiveBoardMemberIdsAsync(cancellationToken);
        var boardVotes = await GetBoardVotesForSeriesAsync(seriesId, boardMemberIds, cancellationToken);
        var votedCount = boardVotes.Select(v => v.BoardMemberId!.Value).Distinct().Count();
        var claimCount = await _unitOfWork.Context.SeriesBoardReviewClaims
            .CountAsync(c => c.SeriesId == seriesId, cancellationToken);
        var currentUserHasClaimed = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == seriesId && c.BoardMemberId == callerId, cancellationToken);
        var currentUserIsLead = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == seriesId && c.BoardMemberId == callerId && c.IsLead, cancellationToken);
        var leadClaim = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Include(c => c.BoardMember)
            .FirstOrDefaultAsync(c => c.SeriesId == seriesId && c.IsLead, cancellationToken);
        var claimsFull = claimCount >= MaxReviewClaims;
        var hasLead = leadClaim is not null;
        var canClaim = false;
        var canVote = series?.Status == SeriesStatus.PendingReview && currentUserHasClaimed;
        var canClaimLead = false;
        var canManagePublishingSchedule = currentUserIsLead;
        var expiresAt = series?.SubmittedForReviewAt?.AddHours(ReviewExpiryHours);

        var approveVotes = boardVotes.Count(v => v.Decision == VoteDecisions.Approve);
        var rejectVotes = boardVotes.Count(v => v.Decision == VoteDecisions.Reject);
        var callerHasVoted = boardVotes.Any(v => v.BoardMemberId == callerId);
        var callerProfile = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken);
        var callerIsAdmin = callerProfile is not null && PageAccessService.IsAdmin(callerProfile.Role);
        // Không lộ approve/reject khi đang ẩn phiếu (khớp ListVotesAsync).
        if (series?.Status == SeriesStatus.PendingReview
            && !callerIsAdmin
            && votedCount < MinimumBoardVotesForDecision
            && !(votedCount >= 2 && !callerHasVoted))
        {
            var myVote = boardVotes.FirstOrDefault(v => v.BoardMemberId == callerId);
            approveVotes = myVote?.Decision == VoteDecisions.Approve ? 1 : 0;
            rejectVotes = myVote?.Decision == VoteDecisions.Reject ? 1 : 0;
        }

        return new BoardVoteProgressResponse(
            boardMemberIds.Count,
            votedCount,
            approveVotes,
            rejectVotes,
            GetRequiredVoteQuorum(boardMemberIds.Count),
            IsQuorumMet(votedCount, boardMemberIds.Count),
            claimCount,
            MaxReviewClaims,
            currentUserHasClaimed,
            currentUserIsLead,
            canClaim,
            false,
            claimsFull,
            hasLead,
            leadClaim?.BoardMemberId,
            leadClaim?.BoardMember?.FullName,
            canManagePublishingSchedule,
            canVote,
            canClaimLead,
            expiresAt,
            series is null ? null : SeriesStatuses.ToDbValue(series.Status));
    }

    public async Task<BoardReviewClaimResponse> ClaimLeadAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        throw new WorkflowForbiddenException(
            "Lead do Admin gán toàn cục trong Cài đặt Admin. Board không tự nhận phụ trách chính.");
    }

    public async Task<GlobalBoardLeadResponse?> GetGlobalBoardLeadAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
        if (!PageAccessService.IsAdmin(caller.Role) && !PageAccessService.IsBoard(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires admin or board role.");
        }

        var lead = await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.IsBoardLead, cancellationToken);

        return lead is null
            ? null
            : new GlobalBoardLeadResponse(lead.Id, lead.FullName);
    }

    public async Task<GlobalBoardLeadResponse> AssignGlobalBoardLeadAsync(
        Guid callerId,
        Guid boardMemberId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
        if (!PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Chỉ Admin được gán Board Lead toàn cục.");
        }

        var target = await _unitOfWork.Repository<Profile>().GetByIdAsync(boardMemberId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Board member not found.");
        if (target.Role != ProfileRole.Board)
        {
            throw new ArgumentException("Chỉ được gán Lead cho tài khoản role board.");
        }

        if (target.IsActive == false)
        {
            throw new ArgumentException("Board member đang không hoạt động.");
        }

        var previousLeads = await _unitOfWork.Context.Profiles
            .Where(p => p.IsBoardLead && p.Id != boardMemberId)
            .ToListAsync(cancellationToken);
        foreach (var prev in previousLeads)
        {
            prev.IsBoardLead = false;
        }

        target.IsBoardLead = true;
        await SyncAllClaimsToGlobalLeadAsync(boardMemberId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _notificationService.CreateAsync(
            boardMemberId,
            "Bạn là Board Lead",
            "Admin đã gán bạn làm Lead hội đồng toàn cục. Bạn phụ trách lên lịch xuất bản các series đã duyệt.",
            "/board/approved-series",
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken: cancellationToken);

        return new GlobalBoardLeadResponse(target.Id, target.FullName);
    }

    public async Task ClearGlobalBoardLeadAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
        if (!PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Chỉ Admin được hủy Board Lead toàn cục.");
        }

        var leads = await _unitOfWork.Context.Profiles
            .Where(p => p.IsBoardLead)
            .ToListAsync(cancellationToken);
        foreach (var lead in leads)
        {
            lead.IsBoardLead = false;
        }

        var claimLeads = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.IsLead)
            .ToListAsync(cancellationToken);
        foreach (var claim in claimLeads)
        {
            claim.IsLead = false;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Deprecated: Lead hiện là toàn cục — chuyển sang AssignGlobalBoardLeadAsync.</summary>
    public async Task<BoardReviewClaimResponse> AssignLeadByAdminAsync(
        Guid callerId,
        Guid seriesId,
        Guid boardMemberId,
        CancellationToken cancellationToken = default)
    {
        await AssignGlobalBoardLeadAsync(callerId, boardMemberId, cancellationToken);
        var claim = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Include(c => c.BoardMember)
            .FirstOrDefaultAsync(c => c.SeriesId == seriesId && c.BoardMemberId == boardMemberId, cancellationToken)
            ?? throw new ArgumentException("Board Lead đã được gán toàn cục nhưng không có claim trên series này.");
        var allClaims = await LoadSeriesClaimsAsync(seriesId, cancellationToken);
        return BuildClaimResponse(seriesId, boardMemberId, claim, allClaims);
    }

    public async Task<IReadOnlyList<BoardReviewerSummaryItem>> ListSeriesReviewersAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
        if (!PageAccessService.IsAdmin(caller.Role) && !PageAccessService.IsBoard(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires admin or board role.");
        }

        var claims = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Include(c => c.BoardMember)
            .Where(c => c.SeriesId == seriesId)
            .OrderByDescending(c => c.IsLead)
            .ThenBy(c => c.ClaimedAt)
            .ToListAsync(cancellationToken);

        return claims
            .Select(c => new BoardReviewerSummaryItem(
                c.BoardMemberId,
                c.BoardMember?.FullName ?? "Board",
                c.Source,
                c.IsLead))
            .ToList();
    }

    public async Task<IReadOnlyList<LeaderboardItemResponse>> GetLeaderboardAsync(
        Guid callerId,
        string? metric,
        int? issueNumber = null,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var rankings = (await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Include(r => r.Series)
            .ToListAsync(cancellationToken))
            .Where(r => r.Series is not null)
            .ToList();

        IEnumerable<Ranking> sourceRankings = rankings;
        if (issueNumber is int issue)
        {
            sourceRankings = rankings.Where(r => r.IssueNumber == issue);
        }
        else
        {
            sourceRankings = rankings
                .GroupBy(r => r.SeriesId)
                .Select(g => g.OrderByDescending(r => r.IssueNumber).First());
        }

        var items = sourceRankings
            .Select(r => new
            {
                r.SeriesId,
                r.Series!.Title,
                r.RankPosition,
                IssueVotes = r.VoteCount ?? 0,
                IssuePopularity = r.PopularityScore ?? 0,
                TotalVotes = rankings.Where(x => x.SeriesId == r.SeriesId).Sum(x => x.VoteCount ?? 0),
                Popularity = rankings.Where(x => x.SeriesId == r.SeriesId).Max(x => x.PopularityScore ?? 0)
            })
            .ToList();

        var usePopularity = string.Equals(metric, "popularity", StringComparison.OrdinalIgnoreCase);
        var useRank = string.Equals(metric, "rank", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(metric);

        var ordered = useRank
            ? items.OrderBy(x => x.RankPosition).ThenByDescending(x => x.IssueVotes)
            : usePopularity
                ? items.OrderByDescending(x => issueNumber is null ? x.Popularity : x.IssuePopularity)
                    .ThenBy(x => x.RankPosition)
                : items.OrderByDescending(x => issueNumber is null ? x.TotalVotes : x.IssueVotes)
                    .ThenBy(x => x.RankPosition);

        return ordered.Select(x => new LeaderboardItemResponse(
            x.SeriesId,
            x.Title,
            x.RankPosition,
            issueNumber is null ? x.TotalVotes : x.IssueVotes,
            issueNumber is null ? x.Popularity : x.IssuePopularity)).ToList();
    }

    public async Task<DangerSeriesDecisionResponse> DecideDangerSeriesAsync(
        Guid callerId,
        Guid seriesId,
        DecideDangerSeriesRequest request,
        CancellationToken cancellationToken = default)
    {
        _ = await RequireBoardMemberAsync(callerId, allowAdmin: false, cancellationToken);
        var decision = request.Decision.Trim().ToLowerInvariant();
        if (!DangerDecisions.Contains(decision))
        {
            throw new ArgumentException($"Invalid danger-series decision. Allowed: {string.Join(", ", DangerDecisions)}.");
        }

        var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Series not found.");
        var latestRanking = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Where(r => r.SeriesId == seriesId)
            .OrderByDescending(r => r.IssueNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (series.Status != SeriesStatus.Publishing
            || latestRanking is null
            || latestRanking.RankPosition < DangerRankPositionThreshold)
        {
            throw new WorkflowForbiddenException("Only publishing series in the danger zone can receive this decision.");
        }

        await RequireBoardLeadOrLegacyAsync(callerId, seriesId, cancellationToken);

        var alreadyHandled = await _unitOfWork.Context.ActivityLogs
            .AsNoTracking()
            .AnyAsync(log => log.Action == ActivityActions.DangerDecision
                && log.EntityType == ActivityEntityTypes.Series
                && log.EntityId == seriesId
                && log.CreatedAt >= latestRanking.CreatedAt,
                cancellationToken);
        if (alreadyHandled)
        {
            throw new WorkflowForbiddenException("The current danger-zone ranking has already received a board decision.");
        }

        switch (decision)
        {
            case "monthly":
                series.PublishingFrequency = PublishingFrequency.Monthly;
                break;
            case "hiatus":
                series.Status = SeriesStatus.Hiatus;
                break;
            case "cancel":
                series.Status = SeriesStatus.Cancelled;
                break;
        }

        series.UpdatedAt = DateTime.UtcNow;
        SeriesRepository.Update(series);
        await ActivityLogRepository.AddAsync(new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = callerId,
            Action = ActivityActions.DangerDecision,
            EntityType = ActivityEntityTypes.Series,
            EntityId = series.Id,
            NewData = JsonSerializer.Serialize(new
            {
                decision,
                reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim()
            }),
            CreatedAt = DateTime.UtcNow
        }, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var decisionLabel = decision switch
        {
            "monthly" => "chuyển sang xuất bản hàng tháng",
            "hiatus" => "tạm dừng (hiatus)",
            "cancel" => "hủy bỏ",
            _ => "tiếp tục theo lịch hiện tại"
        };
        var reasonSuffix = string.IsNullOrWhiteSpace(request.Reason)
            ? string.Empty
            : $" Lý do: {request.Reason.Trim()}";
        var dangerMessage =
            $"Hội đồng đã quyết định series \"{series.Title}\" {decisionLabel}.{reasonSuffix}";

        await _notificationService.CreateAsync(
            series.AuthorId,
            "Quyết định vùng nguy hiểm",
            dangerMessage,
            WorkflowNotificationPaths.MangakaSeries(series.Id),
            WorkflowNotificationPaths.CategoryRanking,
            cancellationToken: cancellationToken);

        if (series.EditorId is Guid editorId)
        {
            await _notificationService.CreateAsync(
                editorId,
                "Quyết định vùng nguy hiểm",
                dangerMessage,
                WorkflowNotificationPaths.EditorSeries(series.Id),
                WorkflowNotificationPaths.CategoryRanking,
                cancellationToken: cancellationToken);
        }

        return new DangerSeriesDecisionResponse(
            series.Id,
            decision,
            SeriesStatuses.ToDbValue(series.Status),
            series.PublishingFrequency is null ? null : PublishingFrequencies.ToDbValue(series.PublishingFrequency.Value));
    }

    private async Task TryAutoUpdateSeriesStatusAsync(
        DAL.Models.Series series,
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        if (series.Status != SeriesStatus.PendingReview)
        {
            return;
        }

        var boardMemberIds = await GetActiveBoardMemberIdsAsync(cancellationToken);
        if (boardMemberIds.Count == 0)
        {
            return;
        }

        var votes = await GetBoardVotesForSeriesAsync(seriesId, boardMemberIds, cancellationToken);
        var votedMemberIds = votes.Select(v => v.BoardMemberId!.Value).Distinct().ToHashSet();
        if (!IsQuorumMet(votedMemberIds.Count, boardMemberIds.Count))
        {
            return;
        }

        var approves = votes.Count(v => v.Decision == VoteDecisions.Approve);
        var rejects = votes.Count(v => v.Decision == VoteDecisions.Reject);

        if (approves > rejects)
        {
            series.Status = SeriesStatus.Approved;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);

            await ActivityLogRepository.AddAsync(new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = series.AuthorId,
                Action = ActivityActions.BoardApproved,
                EntityType = ActivityEntityTypes.Series,
                EntityId = series.Id,
                NewData = JsonSerializer.Serialize(new { approved_at = DateTime.UtcNow }),
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);

            await NotifyAuthorReviewDecisionAsync(series, approved: true, cancellationToken);
            await NotifyAdminsAssignLeadAsync(seriesId, series, cancellationToken);
        }
        else
        {
            series.Status = SeriesStatus.Cancelled;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);
            await NotifyAuthorReviewDecisionAsync(series, approved: false, cancellationToken);
        }
    }

    private async Task NotifyAuthorReviewDecisionAsync(
        DAL.Models.Series series,
        bool approved,
        CancellationToken cancellationToken)
    {
        var authorId = series.AuthorId;
        var title = series.Title;
        if (approved)
        {
            await _notificationService.CreateAsync(
                authorId,
                "Series đã được duyệt",
                $"Series \"{title}\" đã được hội đồng phê duyệt.",
                WorkflowNotificationPaths.MangakaSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }
        else
        {
            await _notificationService.CreateAsync(
                authorId,
                "Series bị từ chối",
                $"Series \"{title}\" đã bị hội đồng từ chối. Bạn có thể chỉnh sửa và gửi lại.",
                WorkflowNotificationPaths.MangakaSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }
    }

    private async Task UpsertBoardVoteAsync(
        Guid seriesId,
        Guid boardMemberId,
        string decision,
        string? comment,
        PublishingFrequency? publishingFrequency,
        CancellationToken cancellationToken)
    {
        var existing = await _unitOfWork.Context.BoardVotes
            .FirstOrDefaultAsync(
                v => v.SeriesId == seriesId && v.BoardMemberId == boardMemberId,
                cancellationToken);

        if (existing is not null)
        {
            existing.Decision = decision;
            existing.Comment = comment;
            if (publishingFrequency is not null)
            {
                existing.PublishingFrequency = publishingFrequency;
            }

            VoteRepository.Update(existing);
            return;
        }

        var vote = new BoardVote
        {
            Id = Guid.NewGuid(),
            SeriesId = seriesId,
            BoardMemberId = boardMemberId,
            Decision = decision,
            Comment = comment,
            PublishingFrequency = publishingFrequency,
            CreatedAt = DateTime.UtcNow
        };

        await VoteRepository.AddAsync(vote, cancellationToken);
    }

    private static PublishingFrequency? ResolveApprovedPublishingFrequency(
        IReadOnlyList<BoardVote> votes,
        Guid? leadBoardMemberId)
    {
        if (leadBoardMemberId is Guid leadId)
        {
            var leadVote = votes.FirstOrDefault(
                v => v.BoardMemberId == leadId && v.Decision == VoteDecisions.Approve);
            if (leadVote?.PublishingFrequency is not null)
            {
                return leadVote.PublishingFrequency;
            }
        }

        return votes
            .Where(v => v.Decision == VoteDecisions.Approve && v.PublishingFrequency is not null)
            .GroupBy(v => v.PublishingFrequency!.Value)
            .OrderByDescending(g => g.Count())
            .Select(g => (PublishingFrequency?)g.Key)
            .FirstOrDefault();
    }

    private static int GetRequiredVoteQuorum(int totalBoardMembers) =>
        totalBoardMembers <= 0
            ? 0
            : Math.Min(MinimumBoardVotesForDecision, totalBoardMembers);

    private static bool IsQuorumMet(int votedCount, int totalBoardMembers) =>
        totalBoardMembers > 0 && votedCount >= GetRequiredVoteQuorum(totalBoardMembers);

    private async Task<List<Guid>> GetActiveBoardMemberIdsAsync(CancellationToken cancellationToken) =>
        await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .Where(p => p.Role == ProfileRole.Board && (p.IsActive == null || p.IsActive == true))
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

    private async Task<List<BoardVote>> GetBoardVotesForSeriesAsync(
        Guid seriesId,
        IReadOnlyCollection<Guid> boardMemberIds,
        CancellationToken cancellationToken)
    {
        if (boardMemberIds.Count == 0)
        {
            return [];
        }

        return await _unitOfWork.Context.BoardVotes
            .AsNoTracking()
            .Where(v => v.SeriesId == seriesId && v.BoardMemberId != null && boardMemberIds.Contains(v.BoardMemberId.Value))
            .ToListAsync(cancellationToken);
    }

    private async Task<Profile> RequireBoardMemberAsync(
        Guid callerId,
        bool allowAdmin,
        CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        if (!PageAccessService.IsBoard(caller.Role)
            && !(allowAdmin && PageAccessService.IsAdmin(caller.Role)))
        {
            throw new WorkflowForbiddenException(allowAdmin ? "Requires board or admin role." : "Requires board role.");
        }

        return caller;
    }

    private async Task RequireBoardOrAdminAsync(Guid callerId, CancellationToken cancellationToken)
    {
        _ = await RequireBoardMemberAsync(callerId, allowAdmin: true, cancellationToken);
    }

    private static PendingSeriesItemResponse MapPendingSeriesItem(
        DAL.Models.Series series,
        IReadOnlyList<BoardVote> votes,
        IReadOnlyList<SeriesBoardReviewInvitation> invitations,
        IReadOnlyList<SeriesBoardReviewClaim> claims,
        IReadOnlyList<Guid> boardMemberIds,
        Guid callerId)
    {
        var seriesVotes = votes
            .Where(v => v.SeriesId == series.Id && v.BoardMemberId != null && boardMemberIds.Contains(v.BoardMemberId.Value))
            .ToList();
        var votedCount = seriesVotes.Select(v => v.BoardMemberId!.Value).Distinct().Count();
        var myVote = seriesVotes.FirstOrDefault(v => v.BoardMemberId == callerId);
        var myInvitation = invitations.FirstOrDefault(i => i.SeriesId == series.Id && i.BoardMemberId == callerId);
        var seriesClaims = claims.Where(c => c.SeriesId == series.Id).ToList();
        var claimCount = seriesClaims.Count;
        var myClaim = seriesClaims.FirstOrDefault(c => c.BoardMemberId == callerId);
        var leadClaim = seriesClaims.FirstOrDefault(c => c.IsLead);
        var expiresAt = series.SubmittedForReviewAt?.AddHours(ReviewExpiryHours);
        var claimsFull = claimCount >= MaxReviewClaims;
        var hasLead = leadClaim is not null;
        var canClaim = false;
        var canClaimAsLead = false;
        var canManagePublishingSchedule = myClaim?.IsLead == true;

        var approveVotes = seriesVotes.Count(v => v.Decision == VoteDecisions.Approve);
        var rejectVotes = seriesVotes.Count(v => v.Decision == VoteDecisions.Reject);
        if (votedCount < MinimumBoardVotesForDecision && !(votedCount >= 2 && myVote is null))
        {
            approveVotes = myVote?.Decision == VoteDecisions.Approve ? 1 : 0;
            rejectVotes = myVote?.Decision == VoteDecisions.Reject ? 1 : 0;
        }

        return new PendingSeriesItemResponse(
            series.Id,
            series.Title,
            SeriesStatuses.ToDbValue(series.Status),
            series.AuthorId,
            series.Author.FullName,
            approveVotes,
            rejectVotes,
            boardMemberIds.Count,
            votedCount,
            claimCount,
            MaxReviewClaims,
            series.SubmittedForReviewAt,
            expiresAt,
            myVote is not null,
            myClaim is not null,
            myClaim?.IsLead == true,
            myInvitation?.Status,
            canClaim,
            canClaimAsLead,
            claimsFull,
            hasLead,
            leadClaim?.BoardMemberId,
            leadClaim?.BoardMember?.FullName,
            canManagePublishingSchedule);
    }

    private async Task<List<SeriesBoardReviewClaim>> LoadSeriesClaimsAsync(
        Guid seriesId,
        CancellationToken cancellationToken) =>
        await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Include(c => c.BoardMember)
            .Where(c => c.SeriesId == seriesId)
            .ToListAsync(cancellationToken);

    private static BoardReviewClaimResponse BuildClaimResponse(
        Guid seriesId,
        Guid boardMemberId,
        SeriesBoardReviewClaim userClaim,
        IReadOnlyList<SeriesBoardReviewClaim> allClaims)
    {
        var leadClaim = allClaims.FirstOrDefault(c => c.IsLead);
        var claimCount = allClaims.Count;
        return new BoardReviewClaimResponse(
            seriesId,
            boardMemberId,
            claimCount,
            MaxReviewClaims,
            claimCount >= MaxReviewClaims,
            userClaim.IsLead,
            leadClaim is not null,
            leadClaim?.BoardMemberId,
            leadClaim?.BoardMember?.FullName,
            userClaim.ClaimedAt);
    }

    public async Task RequireBoardLeadOrLegacyAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        var claimCount = await _unitOfWork.Context.SeriesBoardReviewClaims
            .CountAsync(c => c.SeriesId == seriesId, cancellationToken);
        if (claimCount == 0)
        {
            return;
        }

        var isLead = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == seriesId && c.BoardMemberId == callerId && c.IsLead, cancellationToken);
        if (!isLead)
        {
            throw new WorkflowForbiddenException("Chỉ board phụ trách chính mới được thực hiện thao tác này.");
        }
    }

    private async Task EnsureLeadAssignedAfterExpiryAsync(
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        if (series.Status is not (SeriesStatus.Approved or SeriesStatus.Publishing or SeriesStatus.Completed or SeriesStatus.Hiatus))
        {
            return;
        }

        var hasLead = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == series.Id && c.IsLead, cancellationToken);
        if (hasLead)
        {
            return;
        }

        var approvedAt = await GetBoardApprovedAtAsync(series.Id, cancellationToken);
        if (approvedAt is null)
        {
            // Series cũ duyệt trước khi có log — coi UpdatedAt khi approved là mốc dự phòng.
            approvedAt = series.UpdatedAt ?? DateTime.UtcNow.AddDays(-LeadClaimExpiryDays);
            await ActivityLogRepository.AddAsync(new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = series.AuthorId,
                Action = ActivityActions.BoardApproved,
                EntityType = ActivityEntityTypes.Series,
                EntityId = series.Id,
                NewData = JsonSerializer.Serialize(new { approved_at = approvedAt, backfill = true }),
                CreatedAt = approvedAt.Value
            }, cancellationToken);
        }

        if (DateTime.UtcNow < approvedAt.Value.AddDays(LeadClaimExpiryDays))
        {
            return;
        }

        var firstClaim = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.SeriesId == series.Id)
            .OrderBy(c => c.ClaimedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (firstClaim is null)
        {
            return;
        }

        firstClaim.IsLead = true;
        await _notificationService.CreateAsync(
            firstClaim.BoardMemberId,
            "Bạn được gán phụ trách chính",
            $"Sau {LeadClaimExpiryDays} ngày chưa ai nhận, hệ thống đã gán bạn làm phụ trách chính series \"{series.Title}\".",
            WorkflowNotificationPaths.BoardApprovedSeries(series.Id),
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken: cancellationToken);
    }

    private async Task EnsureFixedBoardClaimsIfMissingAsync(
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        if (series.Status != SeriesStatus.PendingReview)
        {
            return;
        }

        var existingIds = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.SeriesId == series.Id)
            .Select(c => c.BoardMemberId)
            .ToListAsync(cancellationToken);

        if (existingIds.Count < MaxReviewClaims)
        {
            var allBoards = await _unitOfWork.Context.Profiles
                .AsNoTracking()
                .Where(p => p.Role == ProfileRole.Board && (p.IsActive == null || p.IsActive == true))
                .OrderBy(p => p.FullName)
                .ToListAsync(cancellationToken);
            var boards = SelectFixedBoardMembers(allBoards, MaxReviewClaims);

            var claimedAt = DateTime.UtcNow;
            var assigned = existingIds.ToHashSet();
            foreach (var board in boards)
            {
                if (assigned.Count >= MaxReviewClaims)
                {
                    break;
                }

                if (!assigned.Add(board.Id))
                {
                    continue;
                }

                _unitOfWork.Context.SeriesBoardReviewClaims.Add(new SeriesBoardReviewClaim
                {
                    SeriesId = series.Id,
                    BoardMemberId = board.Id,
                    Source = "fixed_board",
                    ClaimedAt = claimedAt,
                    IsLead = board.IsBoardLead
                });
            }
        }

        await ApplyGlobalLeadToSeriesClaimsAsync(series.Id, cancellationToken);
    }

    private async Task SyncAllClaimsToGlobalLeadAsync(Guid leadBoardMemberId, CancellationToken cancellationToken)
    {
        var claimLeads = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.IsLead)
            .ToListAsync(cancellationToken);
        foreach (var claim in claimLeads)
        {
            claim.IsLead = false;
        }

        var leadClaims = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.BoardMemberId == leadBoardMemberId)
            .ToListAsync(cancellationToken);
        foreach (var claim in leadClaims)
        {
            claim.IsLead = true;
        }
    }

    private async Task ApplyGlobalLeadToSeriesClaimsAsync(Guid seriesId, CancellationToken cancellationToken)
    {
        var globalLeadId = await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .Where(p => p.IsBoardLead)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var claims = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.SeriesId == seriesId)
            .ToListAsync(cancellationToken);
        foreach (var claim in claims)
        {
            claim.IsLead = globalLeadId.HasValue && claim.BoardMemberId == globalLeadId.Value;
        }
    }

    /// <summary>Ưu tiên Board Lead toàn cục trong nhóm tối đa <paramref name="max"/> board.</summary>
    internal static List<Profile> SelectFixedBoardMembers(IReadOnlyList<Profile> boards, int max)
    {
        if (max <= 0 || boards.Count == 0)
        {
            return new List<Profile>();
        }

        var result = new List<Profile>(max);
        var lead = boards.FirstOrDefault(b => b.IsBoardLead);
        if (lead is not null)
        {
            result.Add(lead);
        }

        foreach (var board in boards.Where(b => !b.IsBoardLead).OrderBy(b => b.FullName))
        {
            if (result.Count >= max)
            {
                break;
            }

            result.Add(board);
        }

        return result;
    }

    private async Task<DateTime?> GetBoardApprovedAtAsync(Guid seriesId, CancellationToken cancellationToken)
    {
        var log = await _unitOfWork.Context.ActivityLogs
            .AsNoTracking()
            .Where(l => l.Action == ActivityActions.BoardApproved
                && l.EntityType == ActivityEntityTypes.Series
                && l.EntityId == seriesId
                && l.CreatedAt != null)
            .OrderBy(l => l.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return log?.CreatedAt;
    }

    private async Task NotifyLeadBoardMemberAsync(
        Guid seriesId,
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        var lead = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.SeriesId == seriesId && c.IsLead, cancellationToken);
        if (lead is null)
        {
            return;
        }

        await _notificationService.CreateAsync(
            lead.BoardMemberId,
            "Series đã được phê duyệt",
            $"Series \"{series.Title}\" đã được hội đồng phê duyệt. Bạn là phụ trách chính — hãy theo dõi sản xuất và lên lịch xuất bản khi sẵn sàng.",
            WorkflowNotificationPaths.BoardApprovedSeries(seriesId),
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken: cancellationToken);
    }

    private async Task NotifyAdminsAssignLeadAsync(
        Guid seriesId,
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        var hasGlobalLead = await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .AnyAsync(p => p.IsBoardLead, cancellationToken);
        if (hasGlobalLead)
        {
            await ApplyGlobalLeadToSeriesClaimsAsync(seriesId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await NotifyLeadBoardMemberAsync(seriesId, series, cancellationToken);
            return;
        }

        var adminIds = await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .Where(p => p.Role == ProfileRole.Admin && (p.IsActive == null || p.IsActive == true))
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);
        if (adminIds.Count == 0)
        {
            return;
        }

        await _notificationService.CreateForUsersAsync(
            adminIds,
            "Chưa có Board Lead toàn cục",
            $"Series \"{series.Title}\" đã được duyệt. Hãy gán Board Lead trong Admin → Cài đặt Admin.",
            "/admin/settings",
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken);
    }

    private async Task NotifyReviewersToClaimLeadAsync(
        Guid seriesId,
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        await NotifyAdminsAssignLeadAsync(seriesId, series, cancellationToken);
    }

    private async Task NotifyReviewersOnApproveAsync(
        Guid seriesId,
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        await NotifyAdminsAssignLeadAsync(seriesId, series, cancellationToken);
    }

    private async Task NotifyAfterReviewClaimAsync(
        DAL.Models.Series series,
        Profile claimant,
        IReadOnlyList<SeriesBoardReviewClaim> allClaims,
        bool fromPublicClaim,
        CancellationToken cancellationToken)
    {
        var claimCount = allClaims.Count;
        var title = series.Title;

        if (claimCount >= MaxReviewClaims)
        {
            await _notificationService.CreateAsync(
                series.AuthorId,
                "Đủ 3 reviewer xét duyệt",
                $"Series \"{title}\" đã có đủ {MaxReviewClaims} reviewer. Series chuyển sang giai đoạn phê duyệt nội bộ.",
                WorkflowNotificationPaths.MangakaSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);

            await _notificationService.CreateForUsersAsync(
                allClaims.Select(c => c.BoardMemberId),
                "Series sẵn sàng phê duyệt",
                $"Series \"{title}\" đã đủ {MaxReviewClaims} reviewer. Hãy tiếp tục bỏ phiếu trong mục Series Đã Nhận.",
                WorkflowNotificationPaths.BoardApprovedSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken);
            return;
        }

        if (fromPublicClaim)
        {
            await _notificationService.CreateAsync(
                series.AuthorId,
                "Có reviewer nhận series",
                $"{claimant.FullName} đã nhận xét duyệt \"{title}\" ({claimCount}/{MaxReviewClaims}).",
                WorkflowNotificationPaths.MangakaSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }
    }

    private async Task EnsureReviewClaimAsync(
        Guid seriesId,
        Guid boardMemberId,
        string source,
        CancellationToken cancellationToken)
    {
        var existing = await _unitOfWork.Context.SeriesBoardReviewClaims
            .FirstOrDefaultAsync(c => c.SeriesId == seriesId && c.BoardMemberId == boardMemberId, cancellationToken);
        if (existing is not null)
        {
            return;
        }

        await using var transaction = await _unitOfWork.Context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var claimCount = await _unitOfWork.Context.SeriesBoardReviewClaims
            .CountAsync(c => c.SeriesId == seriesId, cancellationToken);
        if (claimCount >= MaxReviewClaims)
        {
            throw new WorkflowForbiddenException("Đã đủ 3 reviewer nhận series này.");
        }

        _unitOfWork.Context.SeriesBoardReviewClaims.Add(new SeriesBoardReviewClaim
        {
            SeriesId = seriesId,
            BoardMemberId = boardMemberId,
            Source = source,
            ClaimedAt = DateTime.UtcNow,
            IsLead = false
        });
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private static BoardVoteResponse MapVote(BoardVote v, string? seriesTitle, string? memberName) =>
        new(
            v.Id,
            v.SeriesId,
            seriesTitle,
            v.BoardMemberId,
            memberName,
            v.Decision,
            v.Comment,
            v.PublishingFrequency is null ? null : PublishingFrequencies.ToDbValue(v.PublishingFrequency.Value),
            v.CreatedAt);
}
