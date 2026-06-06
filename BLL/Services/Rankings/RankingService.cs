using Microsoft.EntityFrameworkCore;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Dtos.Rankings;

namespace BLL.Services.Rankings;

public class RankingService
{
    private readonly UnitOfWork _unitOfWork;
    private Repository<Ranking> Repository => _unitOfWork.Repository<Ranking>();

    public RankingService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<RankingResponse> CreateAsync(
        Guid callerId,
        CreateRankingRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var seriesExists = await _unitOfWork.Repository<DAL.Models.Series>()
            .AnyAsync(s => s.Id == request.SeriesId, cancellationToken);
        if (!seriesExists)
        {
            throw new ArgumentException("Series not found.");
        }

        var ranking = new Ranking
        {
            Id = Guid.NewGuid(),
            SeriesId = request.SeriesId,
            IssueNumber = request.IssueNumber,
            RankPosition = request.RankPosition,
            VoteCount = request.VoteCount ?? 0,
            PopularityScore = request.PopularityScore ?? 0,
            CreatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(ranking, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var series = await _unitOfWork.Repository<DAL.Models.Series>()
            .GetByIdAsync(request.SeriesId, cancellationToken: cancellationToken);

        return Map(ranking, series?.Title);
    }

    public async Task<RankingHistoryResponse?> GetHistoryAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken);
        if (series is null)
        {
            return null;
        }

        if (!CanViewRankingHistory(caller, series))
        {
            throw new WorkflowForbiddenException("You do not have permission to view ranking history.");
        }

        var items = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Where(r => r.SeriesId == seriesId)
            .OrderByDescending(r => r.IssueNumber)
            .ToListAsync(cancellationToken);

        return new RankingHistoryResponse(
            seriesId,
            series.Title,
            items.Select(r => Map(r, series.Title)).ToList());
    }

    private static bool CanViewRankingHistory(Profile caller, DAL.Models.Series series) =>
        PageAccessService.IsAdmin(caller.Role)
        || PageAccessService.IsBoard(caller.Role)
        || PageAccessService.IsEditor(caller.Role)
        || series.AuthorId == caller.Id;

    private async Task RequireBoardOrAdminAsync(Guid callerId, CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        if (!PageAccessService.IsBoard(caller.Role) && !PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Requires board or admin role.");
        }
    }

    private static RankingResponse Map(Ranking r, string? seriesTitle) =>
        new(r.Id, r.SeriesId, seriesTitle, r.IssueNumber, r.RankPosition, r.VoteCount, r.PopularityScore, r.CreatedAt);
}
