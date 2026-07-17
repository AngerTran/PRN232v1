using Microsoft.EntityFrameworkCore;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Dtos.Rankings;
using BLL.Services.Notifications;
using BLL.Common;

namespace BLL.Services.Rankings;

public class RankingService
{
    private const int DangerRankPositionThreshold = 30;

    private readonly UnitOfWork _unitOfWork;
    private readonly NotificationService _notificationService;
    private Repository<Ranking> Repository => _unitOfWork.Repository<Ranking>();
    private Repository<ActivityLog> ActivityLogRepository => _unitOfWork.Repository<ActivityLog>();

    public RankingService(UnitOfWork unitOfWork, NotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<RankingResponse> CreateAsync(
        Guid callerId,
        CreateRankingRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var series = await _unitOfWork.Repository<DAL.Models.Series>()
            .GetByIdAsync(request.SeriesId, asNoTracking: false, cancellationToken)
            ?? throw new ArgumentException("Series not found.");

        // Hạng tạm — sẽ xếp lại theo vote cho cả kỳ.
        var ranking = await UpsertRankingAsync(
            series,
            request with { RankPosition = request.RankPosition is > 0 ? request.RankPosition : null },
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var ordered = await ReassignRanksByVotesAsync(request.IssueNumber, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        ranking = ordered.First(r => r.SeriesId == request.SeriesId);
        await NotifyDangerZoneIfNeededAsync(series, ranking, cancellationToken);

        return Map(ranking, series.Title);
    }

    public async Task<BulkRankingResponse> BulkCreateAsync(
        Guid callerId,
        BulkCreateRankingRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        if (request.Entries.Count == 0)
        {
            throw new ArgumentException("At least one ranking entry is required.");
        }

        var seriesIds = request.Entries.Select(e => e.SeriesId).Distinct().ToList();
        var seriesById = await _unitOfWork.Context.Series
            .Where(s => seriesIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        if (seriesById.Count != seriesIds.Count)
        {
            throw new ArgumentException("One or more series were not found.");
        }

        foreach (var entry in request.Entries)
        {
            var series = seriesById[entry.SeriesId];
            await UpsertRankingAsync(
                series,
                new CreateRankingRequest(
                    entry.SeriesId,
                    request.IssueNumber,
                    null,
                    entry.VoteCount,
                    entry.PopularityScore,
                    entry.Notes),
                cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var ordered = await ReassignRanksByVotesAsync(request.IssueNumber, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var savedIds = seriesIds.ToHashSet();
        var saved = ordered.Where(r => savedIds.Contains(r.SeriesId)).ToList();

        foreach (var ranking in saved)
        {
            var series = seriesById[ranking.SeriesId];
            await NotifyDangerZoneIfNeededAsync(series, ranking, cancellationToken);
        }

        return new BulkRankingResponse(
            request.IssueNumber,
            saved.Count,
            saved.Select(r => Map(r, seriesById[r.SeriesId].Title)).ToList());
    }

    public async Task<IReadOnlyList<int>> ListIssueNumbersAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);
        await SyncScheduleIssueNumbersAsync(cancellationToken);

        var rankingIssues = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Select(r => r.IssueNumber)
            .Distinct()
            .ToListAsync(cancellationToken);

        var scheduleIssues = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Where(s => s.IssueNumber != null)
            .Select(s => s.IssueNumber!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        return rankingIssues
            .Concat(scheduleIssues)
            .Distinct()
            .OrderByDescending(n => n)
            .ToList();
    }

    public async Task<VoteInputContextResponse> GetVoteInputContextAsync(
        Guid callerId,
        int? issueNumber,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);
        await SyncScheduleIssueNumbersAsync(cancellationToken);

        var availableIssues = await ListIssueNumbersAsync(callerId, cancellationToken);
        var maxRankingIssue = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .MaxAsync(r => (int?)r.IssueNumber, cancellationToken) ?? 0;
        var maxScheduleIssue = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .MaxAsync(s => (int?)s.IssueNumber, cancellationToken) ?? 0;
        var suggestedIssue = Math.Max(maxRankingIssue, maxScheduleIssue);
        if (suggestedIssue == 0)
        {
            suggestedIssue = 1;
        }
        else if (maxRankingIssue >= maxScheduleIssue && maxRankingIssue > 0)
        {
            suggestedIssue = maxRankingIssue;
        }
        else if (maxScheduleIssue > maxRankingIssue)
        {
            suggestedIssue = maxScheduleIssue;
        }

        var selectedIssue = issueNumber ?? suggestedIssue;

        // Hiện tất cả series đang trong vòng xuất bản; kỳ chỉ dùng để gắn data vote + phân loại lịch.
        var publishingStatuses = new[]
        {
            SeriesStatus.Approved,
            SeriesStatus.Publishing,
            SeriesStatus.Completed,
            SeriesStatus.Hiatus,
        };

        var seriesWithAnySchedule = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Where(s => s.SeriesId != null)
            .Select(s => s.SeriesId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var eligibleSeries = await _unitOfWork.Context.Series
            .AsNoTracking()
            .Where(s => publishingStatuses.Contains(s.Status) || seriesWithAnySchedule.Contains(s.Id))
            .OrderBy(s => s.Title)
            .ToListAsync(cancellationToken);

        var issueRankings = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Where(r => r.IssueNumber == selectedIssue)
            .ToListAsync(cancellationToken);

        var scheduleCounts = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Where(s => s.IssueNumber == selectedIssue && s.SeriesId != null)
            .GroupBy(s => s.SeriesId!.Value)
            .Select(g => new { SeriesId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SeriesId, x => x.Count, cancellationToken);

        var rows = eligibleSeries
            .Select(series =>
            {
                var existing = issueRankings.FirstOrDefault(r => r.SeriesId == series.Id);
                scheduleCounts.TryGetValue(series.Id, out var scheduleCount);
                return new VoteInputSeriesRowResponse(
                    series.Id,
                    series.Title,
                    SeriesStatuses.ToDbValue(series.Status),
                    existing?.RankPosition,
                    existing?.VoteCount,
                    existing?.PopularityScore,
                    existing?.Notes,
                    scheduleCount);
            })
            // Có lịch đúng kỳ lên trước, rồi mới tới series chưa gắn lịch kỳ này.
            .OrderByDescending(r => r.ScheduleCountForIssue > 0)
            .ThenBy(r => r.Title)
            .ToList();

        return new VoteInputContextResponse(
            suggestedIssue,
            availableIssues,
            rows);
    }

    private async Task SyncScheduleIssueNumbersAsync(CancellationToken cancellationToken)
    {
        var items = await _unitOfWork.Context.PublishingSchedules.ToListAsync(cancellationToken);
        var dirty = false;
        foreach (var schedule in items)
        {
            var expected = PublishingIssueNumbers.FromPublishDate(schedule.PublishDate, schedule.Frequency);
            if (schedule.IssueNumber == expected)
            {
                continue;
            }

            schedule.IssueNumber = expected;
            dirty = true;
        }

        if (dirty)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
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

    public async Task<IReadOnlyList<RankingResponse>> GetRecentInputsAsync(
        Guid callerId,
        int limit = 40,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var take = Math.Clamp(limit, 1, 100);
        var items = await _unitOfWork.Context.Rankings
            .AsNoTracking()
            .Include(r => r.Series)
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.IssueNumber)
            .Take(take)
            .ToListAsync(cancellationToken);

        return items.Select(r => Map(r, r.Series?.Title)).ToList();
    }

    /// <summary>
    /// Xếp hạng theo vote (cao hơn = tốt hơn).
    /// Hòa vote → xét popularity; hòa cả vote lẫn popularity → đồng hạng (cùng số hạng, bỏ chỗ trống).
    /// Ví dụ: #1, #2, #2, #4.
    /// </summary>
    private async Task<List<Ranking>> ReassignRanksByVotesAsync(
        int issueNumber,
        CancellationToken cancellationToken)
    {
        var rankings = await _unitOfWork.Context.Rankings
            .Include(r => r.Series)
            .Where(r => r.IssueNumber == issueNumber)
            .ToListAsync(cancellationToken);

        var ordered = rankings
            .OrderByDescending(r => r.VoteCount ?? 0)
            .ThenByDescending(r => r.PopularityScore ?? 0m)
            .ThenBy(r => r.Series?.Title ?? string.Empty, StringComparer.OrdinalIgnoreCase)
            .ThenBy(r => r.SeriesId)
            .ToList();

        var index = 0;
        while (index < ordered.Count)
        {
            var vote = ordered[index].VoteCount ?? 0;
            var popularity = ordered[index].PopularityScore ?? 0m;
            var end = index + 1;
            while (end < ordered.Count
                && (ordered[end].VoteCount ?? 0) == vote
                && (ordered[end].PopularityScore ?? 0m) == popularity)
            {
                end++;
            }

            var rank = index + 1;
            for (var k = index; k < end; k++)
            {
                ordered[k].RankPosition = rank;
                Repository.Update(ordered[k]);
            }

            index = end;
        }

        return ordered;
    }

    private async Task<Ranking> UpsertRankingAsync(
        DAL.Models.Series series,
        CreateRankingRequest request,
        CancellationToken cancellationToken)
    {
        var existing = await _unitOfWork.Context.Rankings
            .FirstOrDefaultAsync(
                r => r.SeriesId == request.SeriesId && r.IssueNumber == request.IssueNumber,
                cancellationToken);

        if (existing is not null)
        {
            if (request.RankPosition is > 0)
            {
                existing.RankPosition = request.RankPosition.Value;
            }

            existing.VoteCount = request.VoteCount ?? 0;
            existing.PopularityScore = request.PopularityScore ?? 0;
            if (request.Notes is not null)
            {
                existing.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            }
            Repository.Update(existing);
            return existing;
        }

        var ranking = new Ranking
        {
            Id = Guid.NewGuid(),
            SeriesId = request.SeriesId,
            IssueNumber = request.IssueNumber,
            // Placeholder — ReassignRanksByVotesAsync sẽ gán lại ngay sau.
            RankPosition = request.RankPosition is > 0 ? request.RankPosition.Value : 9999,
            VoteCount = request.VoteCount ?? 0,
            PopularityScore = request.PopularityScore ?? 0,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(ranking, cancellationToken);
        return ranking;
    }

    private async Task NotifyDangerZoneIfNeededAsync(
        DAL.Models.Series series,
        Ranking ranking,
        CancellationToken cancellationToken)
    {
        if (series.Status != SeriesStatus.Publishing || ranking.RankPosition < DangerRankPositionThreshold)
        {
            return;
        }

        var alreadyAlerted = await _unitOfWork.Context.ActivityLogs
            .AsNoTracking()
            .AnyAsync(
                log => log.Action == ActivityActions.DangerAlert
                    && log.EntityType == ActivityEntityTypes.Series
                    && log.EntityId == series.Id
                    && log.NewData != null
                    && log.NewData.Contains($"issue:{ranking.IssueNumber}"),
                cancellationToken);
        if (alreadyAlerted)
        {
            return;
        }

        var alreadyDecided = await _unitOfWork.Context.ActivityLogs
            .AsNoTracking()
            .AnyAsync(
                log => log.Action == ActivityActions.DangerDecision
                    && log.EntityType == ActivityEntityTypes.Series
                    && log.EntityId == series.Id
                    && log.CreatedAt >= ranking.CreatedAt,
                cancellationToken);
        if (alreadyDecided)
        {
            return;
        }

        await ActivityLogRepository.AddAsync(new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = series.AuthorId,
            Action = ActivityActions.DangerAlert,
            EntityType = ActivityEntityTypes.Series,
            EntityId = series.Id,
            NewData = System.Text.Json.JsonSerializer.Serialize(new
            {
                issue = ranking.IssueNumber,
                rank = ranking.RankPosition
            }),
            CreatedAt = DateTime.UtcNow
        }, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var boardMemberIds = await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .Where(p => p.Role == ProfileRole.Board && (p.IsActive == null || p.IsActive == true))
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        var message =
            $"Series \"{series.Title}\" xếp hạng #{ranking.RankPosition} ở kỳ {ranking.IssueNumber} — cần xem xét tại Quyết Định Series.";

        var mangakaMessage =
            $"Series \"{series.Title}\" đang xếp hạng #{ranking.RankPosition} (kỳ {ranking.IssueNumber}) — có nguy cơ bị hội đồng xem xét hủy hoặc đổi lịch.";

        await _notificationService.CreateAsync(
            series.AuthorId,
            "Series vào vùng nguy hiểm",
            mangakaMessage,
            WorkflowNotificationPaths.MangakaSeriesRanking(series.Id),
            WorkflowNotificationPaths.CategoryRanking,
            cancellationToken: cancellationToken);

        await _notificationService.CreateForUsersAsync(
            boardMemberIds,
            "Series vào vùng nguy hiểm",
            message,
            WorkflowNotificationPaths.BoardSeriesDecisions(),
            WorkflowNotificationPaths.CategoryRanking,
            cancellationToken);
    }

    public async Task<int> DeleteByIdsAsync(
        Guid callerId,
        IReadOnlyList<Guid> ids,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var distinctIds = ids.Where(id => id != Guid.Empty).Distinct().ToList();
        if (distinctIds.Count == 0)
        {
            return 0;
        }

        var rows = await _unitOfWork.Context.Rankings
            .Where(r => distinctIds.Contains(r.Id))
            .ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return 0;
        }

        var affectedIssues = rows.Select(r => r.IssueNumber).Distinct().ToList();
        _unitOfWork.Context.Rankings.RemoveRange(rows);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        foreach (var issue in affectedIssues)
        {
            await ReassignRanksByVotesAsync(issue, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return rows.Count;
    }

    public async Task<int> DeleteAllAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        var rows = await _unitOfWork.Context.Rankings.ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return 0;
        }

        _unitOfWork.Context.Rankings.RemoveRange(rows);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return rows.Count;
    }

    public async Task<int> PurgeLegacyIssueRankingsAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireBoardOrAdminAsync(callerId, cancellationToken);

        // Encode mới: weekly >= 1_000_000, monthly >= 2_000_000. Số nhỏ hơn = kỳ kiểu cũ (số chương).
        var legacy = await _unitOfWork.Context.Rankings
            .Where(r => r.IssueNumber < PublishingIssueNumbers.WeeklyOffset)
            .ToListAsync(cancellationToken);

        if (legacy.Count == 0)
        {
            await SyncScheduleIssueNumbersAsync(cancellationToken);
            return 0;
        }

        _unitOfWork.Context.Rankings.RemoveRange(legacy);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await SyncScheduleIssueNumbersAsync(cancellationToken);
        return legacy.Count;
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
        new(r.Id, r.SeriesId, seriesTitle, r.IssueNumber, r.RankPosition, r.VoteCount, r.PopularityScore, r.Notes, r.CreatedAt);
}
