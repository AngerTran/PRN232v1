using Microsoft.EntityFrameworkCore;
using System.Data;
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
    public const int ReviewExpiryDays = SeriesReviewRules.ReviewExpiryDays;
    public const int MaxReviewClaims = SeriesReviewRules.MaxActiveReviewSlots;

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
        var cutoff = DateTime.UtcNow.AddDays(-ReviewExpiryDays);
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
                $"Series \"{item.Title}\" đã hết hạn {ReviewExpiryDays} ngày chờ xét duyệt. Bạn có thể chỉnh sửa và gửi lại.",
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
            throw new WorkflowForbiddenException("Bạn cần nhận xét duyệt series trước khi bỏ phiếu.");
        }

        var existing = await _unitOfWork.Context.BoardVotes
            .FirstOrDefaultAsync(
                v => v.SeriesId == request.SeriesId && v.BoardMemberId == callerId,
                cancellationToken);

        var decision = request.Decision.Trim();
        PublishingFrequency? voteFrequency = null;
        if (decision == VoteDecisions.Approve
            && !string.IsNullOrWhiteSpace(request.PublishingFrequency)
            && PublishingFrequencies.IsValid(request.PublishingFrequency))
        {
            voteFrequency = PublishingFrequencies.ParseOrDefault(request.PublishingFrequency);
        }

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
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

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
        return votes.Select(v => MapVote(v, v.Series?.Title, v.BoardMember?.FullName)).ToList();
    }

    public async Task<IReadOnlyList<PendingSeriesItemResponse>> ListPendingSeriesAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);
        await ExpireStalePendingReviewsAsync(cancellationToken);

        var pending = await _unitOfWork.Context.Series
            .AsNoTracking()
            .Include(s => s.Author)
            .Where(s => s.Status == SeriesStatus.PendingReview)
            .ToListAsync(cancellationToken);

        var seriesIds = pending.Select(s => s.Id).ToList();
        var boardMemberIds = await GetActiveBoardMemberIdsAsync(cancellationToken);
        var votes = await _unitOfWork.Context.BoardVotes
            .AsNoTracking()
            .Where(v => v.SeriesId != null && seriesIds.Contains(v.SeriesId.Value))
            .ToListAsync(cancellationToken);
        var invitations = await _unitOfWork.Context.SeriesBoardReviewInvitations
            .AsNoTracking()
            .Where(i => seriesIds.Contains(i.SeriesId))
            .ToListAsync(cancellationToken);
        var claims = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Include(c => c.BoardMember)
            .Where(c => seriesIds.Contains(c.SeriesId))
            .ToListAsync(cancellationToken);

        return pending
            .Select(s => MapPendingSeriesItem(s, votes, invitations, claims, boardMemberIds, callerId))
            .Where(item => item.ClaimedBoardMembers < MaxReviewClaims)
            .ToList();
    }

    public async Task<IReadOnlyList<PendingSeriesItemResponse>> ListInReviewSeriesAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);
        await ExpireStalePendingReviewsAsync(cancellationToken);

        var pending = await _unitOfWork.Context.Series
            .AsNoTracking()
            .Include(s => s.Author)
            .Where(s => s.Status == SeriesStatus.PendingReview)
            .ToListAsync(cancellationToken);

        var seriesIds = pending.Select(s => s.Id).ToList();
        var boardMemberIds = await GetActiveBoardMemberIdsAsync(cancellationToken);
        var votes = await _unitOfWork.Context.BoardVotes
            .AsNoTracking()
            .Where(v => v.SeriesId != null && seriesIds.Contains(v.SeriesId.Value))
            .ToListAsync(cancellationToken);
        var invitations = await _unitOfWork.Context.SeriesBoardReviewInvitations
            .AsNoTracking()
            .Where(i => seriesIds.Contains(i.SeriesId))
            .ToListAsync(cancellationToken);
        var claims = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Include(c => c.BoardMember)
            .Where(c => seriesIds.Contains(c.SeriesId))
            .ToListAsync(cancellationToken);

        return pending
            .Select(s => MapPendingSeriesItem(s, votes, invitations, claims, boardMemberIds, callerId))
            .Where(item => item.ClaimedBoardMembers >= MaxReviewClaims)
            .ToList();
    }

    public async Task<BoardReviewClaimResponse> ClaimReviewAsync(
        Guid callerId,
        Guid seriesId,
        bool wantLead,
        CancellationToken cancellationToken = default)
    {
        _ = await RequireBoardMemberAsync(callerId, allowAdmin: false, cancellationToken);
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
        var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Series not found.");

        if (series.Status != SeriesStatus.PendingReview)
        {
            throw new WorkflowForbiddenException("Chỉ series đang chờ xét duyệt mới có thể nhận.");
        }

        var pendingInvitation = await _unitOfWork.Context.SeriesBoardReviewInvitations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                i => i.SeriesId == seriesId && i.BoardMemberId == callerId && i.Status == "pending",
                cancellationToken);
        if (pendingInvitation is not null)
        {
            throw new WorkflowForbiddenException(
                "Bạn có lời mời xét duyệt đang chờ — hãy chấp nhận hoặc từ chối trong mục Lời mời xét duyệt.");
        }

        var existingClaim = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Include(c => c.BoardMember)
            .FirstOrDefaultAsync(c => c.SeriesId == seriesId && c.BoardMemberId == callerId, cancellationToken);
        if (existingClaim is not null)
        {
            var existingClaims = await LoadSeriesClaimsAsync(seriesId, cancellationToken);
            return BuildClaimResponse(seriesId, callerId, existingClaim, existingClaims);
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

        var hasLead = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == seriesId && c.IsLead, cancellationToken);
        if (wantLead && hasLead)
        {
            throw new WorkflowForbiddenException(
                "Series đã có board phụ trách chính. Bạn có thể nhận với vai trò reviewer (bỏ tick phụ trách).");
        }

        var claimedAt = DateTime.UtcNow;
        var claim = new SeriesBoardReviewClaim
        {
            SeriesId = seriesId,
            BoardMemberId = callerId,
            Source = "public",
            ClaimedAt = claimedAt,
            IsLead = wantLead && !hasLead
        };
        _unitOfWork.Context.SeriesBoardReviewClaims.Add(claim);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var allClaims = await LoadSeriesClaimsAsync(seriesId, cancellationToken);
        await NotifyAfterReviewClaimAsync(series, caller, allClaims, fromPublicClaim: true, cancellationToken);
        return BuildClaimResponse(seriesId, callerId, claim, allClaims);
    }

    public async Task<BoardVoteProgressResponse> GetVoteProgressAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

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
        var pendingInvitation = await _unitOfWork.Context.SeriesBoardReviewInvitations
            .AsNoTracking()
            .AnyAsync(
                i => i.SeriesId == seriesId && i.BoardMemberId == callerId && i.Status == "pending",
                cancellationToken);
        var claimsFull = claimCount >= MaxReviewClaims;
        var hasLead = leadClaim is not null;
        var canClaim = !currentUserHasClaimed
            && !claimsFull
            && !pendingInvitation;
        var canClaimAsLead = canClaim && !hasLead;
        var canManagePublishingSchedule = currentUserIsLead || (!hasLead && claimCount == 0);

        return new BoardVoteProgressResponse(
            boardMemberIds.Count,
            votedCount,
            boardVotes.Count(v => v.Decision == VoteDecisions.Approve),
            boardVotes.Count(v => v.Decision == VoteDecisions.Reject),
            GetRequiredVoteQuorum(boardMemberIds.Count),
            IsQuorumMet(votedCount, boardMemberIds.Count),
            claimCount,
            MaxReviewClaims,
            currentUserHasClaimed,
            currentUserIsLead,
            canClaim,
            canClaimAsLead,
            claimsFull,
            hasLead,
            leadClaim?.BoardMemberId,
            leadClaim?.BoardMember?.FullName,
            canManagePublishingSchedule);
    }

    public async Task<IReadOnlyList<LeaderboardItemResponse>> GetLeaderboardAsync(
        Guid callerId,
        string? metric,
        int? issueNumber = null,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var rankings = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Include(r => r.Series)
            .ToListAsync(cancellationToken);

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
                r.Series.Title,
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
            NewData = string.IsNullOrWhiteSpace(request.Reason)
                ? decision
                : $"{decision}: {request.Reason.Trim()}",
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
            await EnsureSeriesLeadAssignedAsync(seriesId, cancellationToken);
            var leadClaim = await _unitOfWork.Context.SeriesBoardReviewClaims
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.SeriesId == seriesId && c.IsLead, cancellationToken);
            var resolvedFrequency = ResolveApprovedPublishingFrequency(votes, leadClaim?.BoardMemberId);
            if (resolvedFrequency is not null)
            {
                series.PublishingFrequency = resolvedFrequency;
            }

            series.Status = SeriesStatus.Approved;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);
            await NotifyAuthorReviewDecisionAsync(series, approved: true, cancellationToken);
            await NotifyLeadBoardMemberAsync(seriesId, series, cancellationToken);
            await NotifyReviewersOnApproveAsync(seriesId, series, cancellationToken);
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
        var expiresAt = series.SubmittedForReviewAt?.AddDays(ReviewExpiryDays);
        var claimsFull = claimCount >= MaxReviewClaims;
        var hasLead = leadClaim is not null;
        var canClaim = myClaim is null
            && !claimsFull
            && myInvitation?.Status != "pending";
        var canClaimAsLead = canClaim && !hasLead;
        var canManagePublishingSchedule = myClaim?.IsLead == true || (!hasLead && claimCount == 0);

        return new PendingSeriesItemResponse(
            series.Id,
            series.Title,
            SeriesStatuses.ToDbValue(series.Status),
            series.AuthorId,
            series.Author.FullName,
            seriesVotes.Count(v => v.Decision == VoteDecisions.Approve),
            seriesVotes.Count(v => v.Decision == VoteDecisions.Reject),
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

    private async Task EnsureSeriesLeadAssignedAsync(Guid seriesId, CancellationToken cancellationToken)
    {
        var hasLead = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AnyAsync(c => c.SeriesId == seriesId && c.IsLead, cancellationToken);
        if (hasLead)
        {
            return;
        }

        var firstClaim = await _unitOfWork.Context.SeriesBoardReviewClaims
            .Where(c => c.SeriesId == seriesId)
            .OrderBy(c => c.ClaimedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (firstClaim is null)
        {
            return;
        }

        firstClaim.IsLead = true;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
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

    private async Task NotifyReviewersOnApproveAsync(
        Guid seriesId,
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        var nonLeadClaimants = await _unitOfWork.Context.SeriesBoardReviewClaims
            .AsNoTracking()
            .Where(c => c.SeriesId == seriesId && !c.IsLead)
            .Select(c => c.BoardMemberId)
            .ToListAsync(cancellationToken);

        if (nonLeadClaimants.Count == 0)
        {
            return;
        }

        await _notificationService.CreateForUsersAsync(
            nonLeadClaimants,
            "Series đã được phê duyệt",
            $"Series \"{series.Title}\" đã được hội đồng phê duyệt. Bạn đã tham gia xét duyệt series này.",
            WorkflowNotificationPaths.BoardApprovedSeries(seriesId),
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken);
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
