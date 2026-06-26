using Microsoft.EntityFrameworkCore;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Dtos.Board;

namespace BLL.Services.Board;

public class BoardService
{
    public const int MinimumBoardVotesForDecision = 3;

    private const int DangerRankPositionThreshold = 30;
    private static readonly IReadOnlySet<string> DangerDecisions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "continue",
        "monthly",
        "hiatus",
        "cancel"
    };

    private readonly UnitOfWork _unitOfWork;
    private Repository<BoardVote> VoteRepository => _unitOfWork.Repository<BoardVote>();
    private Repository<DAL.Models.Series> SeriesRepository => _unitOfWork.Repository<DAL.Models.Series>();
    private Repository<ActivityLog> ActivityLogRepository => _unitOfWork.Repository<ActivityLog>();

    public BoardService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
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

        var existing = await _unitOfWork.Context.BoardVotes
            .FirstOrDefaultAsync(
                v => v.SeriesId == request.SeriesId && v.BoardMemberId == callerId,
                cancellationToken);

        var decision = request.Decision.Trim();
        if (existing is not null)
        {
            existing.Decision = decision;
            existing.Comment = request.Comment;
            VoteRepository.Update(existing);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await TryAutoUpdateSeriesStatusAsync(series, request.SeriesId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return MapVote(existing, series.Title, caller.FullName);
        }

        var vote = new BoardVote
        {
            Id = Guid.NewGuid(),
            SeriesId = request.SeriesId,
            BoardMemberId = callerId,
            Decision = decision,
            Comment = request.Comment,
            CreatedAt = DateTime.UtcNow
        };

        await VoteRepository.AddAsync(vote, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await TryAutoUpdateSeriesStatusAsync(series, request.SeriesId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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

        return pending.Select(s =>
        {
            var seriesVotes = votes
                .Where(v => v.SeriesId == s.Id && v.BoardMemberId != null && boardMemberIds.Contains(v.BoardMemberId.Value))
                .ToList();
            var votedCount = seriesVotes.Select(v => v.BoardMemberId!.Value).Distinct().Count();
            return new PendingSeriesItemResponse(
                s.Id,
                s.Title,
                SeriesStatuses.ToDbValue(s.Status),
                s.AuthorId,
                s.Author.FullName,
                seriesVotes.Count(v => v.Decision == VoteDecisions.Approve),
                seriesVotes.Count(v => v.Decision == VoteDecisions.Reject),
                boardMemberIds.Count,
                votedCount);
        }).ToList();
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

        return new BoardVoteProgressResponse(
            boardMemberIds.Count,
            votedCount,
            boardVotes.Count(v => v.Decision == VoteDecisions.Approve),
            boardVotes.Count(v => v.Decision == VoteDecisions.Reject),
            GetRequiredVoteQuorum(boardMemberIds.Count),
            IsQuorumMet(votedCount, boardMemberIds.Count));
    }

    public async Task<IReadOnlyList<LeaderboardItemResponse>> GetLeaderboardAsync(
        Guid callerId,
        string? metric,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var rankings = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Include(r => r.Series)
            .ToListAsync(cancellationToken);

        var latestBySeries = rankings
            .GroupBy(r => r.SeriesId)
            .Select(g =>
            {
                var latest = g.OrderByDescending(r => r.IssueNumber).First();
                return new
                {
                    latest.SeriesId,
                    latest.Series.Title,
                    latest.RankPosition,
                    TotalVotes = g.Sum(r => r.VoteCount ?? 0),
                    Popularity = g.Max(r => r.PopularityScore ?? 0)
                };
            });

        var usePopularity = string.Equals(metric, "popularity", StringComparison.OrdinalIgnoreCase);
        var ordered = usePopularity
            ? latestBySeries.OrderByDescending(x => x.Popularity).ThenBy(x => x.RankPosition)
            : latestBySeries.OrderByDescending(x => x.TotalVotes).ThenBy(x => x.RankPosition);

        return ordered.Select(x => new LeaderboardItemResponse(
            x.SeriesId,
            x.Title,
            x.RankPosition,
            x.TotalVotes,
            x.Popularity)).ToList();
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
        }
        else
        {
            series.Status = SeriesStatus.Cancelled;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);
        }
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

    private static BoardVoteResponse MapVote(BoardVote v, string? seriesTitle, string? memberName) =>
        new(v.Id, v.SeriesId, seriesTitle, v.BoardMemberId, memberName, v.Decision, v.Comment, v.CreatedAt);
}
