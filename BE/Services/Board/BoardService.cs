using Microsoft.EntityFrameworkCore;
using PRN232v1.Common;
using PRN232v1.Dtos.Board;
using PRN232v1.Models;
using PRN232v1.Repositories;
using PRN232v1.Services.Workflow;
using SeriesEntity = PRN232v1.Models.Series;

namespace PRN232v1.Services.Board;

public class BoardService
{
    private readonly UnitOfWork _unitOfWork;
    private Repository<BoardVote> VoteRepository => _unitOfWork.Repository<BoardVote>();
    private Repository<SeriesEntity> SeriesRepository => _unitOfWork.Repository<SeriesEntity>();

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

        var caller = await RequireBoardMemberAsync(callerId, cancellationToken);
        var series = await SeriesRepository.GetByIdAsync(request.SeriesId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Series not found.");

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
        var votes = await _unitOfWork.Context.BoardVotes
            .AsNoTracking()
            .Where(v => v.SeriesId != null && seriesIds.Contains(v.SeriesId.Value))
            .ToListAsync(cancellationToken);

        return pending.Select(s =>
        {
            var seriesVotes = votes.Where(v => v.SeriesId == s.Id).ToList();
            return new PendingSeriesItemResponse(
                s.Id,
                s.Title,
                SeriesStatuses.ToDbValue(s.Status),
                s.AuthorId,
                s.Author.FullName,
                seriesVotes.Count(v => v.Decision == VoteDecisions.Approve),
                seriesVotes.Count(v => v.Decision == VoteDecisions.Reject));
        }).ToList();
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

    private async Task TryAutoUpdateSeriesStatusAsync(
        SeriesEntity series,
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        var votes = await _unitOfWork.Context.BoardVotes
            .AsNoTracking()
            .Where(v => v.SeriesId == seriesId)
            .ToListAsync(cancellationToken);

        if (votes.Count == 0)
        {
            return;
        }

        var approves = votes.Count(v => v.Decision == VoteDecisions.Approve);
        var rejects = votes.Count(v => v.Decision == VoteDecisions.Reject);

        if (approves > rejects && series.Status == SeriesStatus.PendingReview)
        {
            series.Status = SeriesStatus.Approved;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);
        }
        else if (rejects > approves && series.Status == SeriesStatus.PendingReview)
        {
            series.Status = SeriesStatus.Cancelled;
            series.UpdatedAt = DateTime.UtcNow;
            SeriesRepository.Update(series);
        }
    }

    private async Task<Profile> RequireBoardMemberAsync(Guid callerId, CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        if (!PageAccessService.IsBoard(caller.Role) && !PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires board or admin role.");
        }

        return caller;
    }

    private async Task RequireBoardOrAdminAsync(Guid callerId, CancellationToken cancellationToken)
    {
        _ = await RequireBoardMemberAsync(callerId, cancellationToken);
    }

    private static BoardVoteResponse MapVote(BoardVote v, string? seriesTitle, string? memberName) =>
        new(v.Id, v.SeriesId, seriesTitle, v.BoardMemberId, memberName, v.Decision, v.Comment, v.CreatedAt);
}
