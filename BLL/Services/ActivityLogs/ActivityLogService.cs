using Microsoft.EntityFrameworkCore;
using BLL.Dtos.ActivityLogs;
using DAL.Common;
using DAL.Models;
using DAL.Repositories;
using SeriesEntity = DAL.Models.Series;

namespace BLL.Services.ActivityLogs;

public class ActivityLogService
{
    private readonly UnitOfWork _unitOfWork;
    private Repository<ActivityLog> Repository => _unitOfWork.Repository<ActivityLog>();
    private Repository<Profile> ProfileRepository => _unitOfWork.Repository<Profile>();

    public ActivityLogService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ActivityLogListResponse> ListAsync(
        Guid callerId,
        Guid? userId,
        string? action,
        string? entityType,
        Guid? entityId,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken cancellationToken = default)
    {
        await EnsureStaffAsync(callerId, cancellationToken);
        return await QueryPagedAsync(userId, action, entityType, entityId, from, to, page, limit, cancellationToken);
    }

    public async Task<ActivityLogListResponse> ListMineAsync(
        Guid callerId,
        string? action,
        string? entityType,
        int page,
        int limit,
        CancellationToken cancellationToken = default)
    {
        _ = await RequireProfileAsync(callerId, cancellationToken);
        return await QueryPagedAsync(callerId, action, entityType, null, null, null, page, limit, cancellationToken);
    }

    public async Task<ActivityLogListResponse> ListBySeriesAsync(
        Guid callerId,
        Guid seriesId,
        int page,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var caller = await RequireProfileAsync(callerId, cancellationToken);
        var series = await _unitOfWork.Repository<SeriesEntity>()
            .GetByIdAsync(seriesId, cancellationToken: cancellationToken);

        if (series is null)
        {
            throw new ArgumentException("Series not found.");
        }

        if (!CanViewSeriesActivity(caller, series))
        {
            throw new ActivityLogForbiddenException("You do not have permission to view activity for this series.");
        }

        var chapterIds = await _unitOfWork.Context.Chapters
            .AsNoTracking()
            .Where(c => c.SeriesId == seriesId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        page = NormalizePage(page);
        limit = NormalizeLimit(limit);

        var query = FilteredQuery(null, null, null, null, null, null)
            .Where(l =>
                (l.EntityType == ActivityEntityTypes.Series && l.EntityId == seriesId)
                || (l.EntityType == ActivityEntityTypes.Chapter && l.EntityId != null && chapterIds.Contains(l.EntityId.Value)));

        var total = await query.CountAsync(cancellationToken);
        var data = await Project(query)
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return new ActivityLogListResponse(data, total, page, limit);
    }

    public async Task<ActivityLogResponse?> GetByIdAsync(
        Guid callerId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var caller = await RequireProfileAsync(callerId, cancellationToken);
        var log = await Project(FilteredQuery(null, null, null, null, null, null))
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (log is null)
        {
            return null;
        }

        if (!CanViewLog(caller, log))
        {
            throw new ActivityLogForbiddenException("You do not have permission to view this activity log.");
        }

        return log;
    }

    public async Task<ActivityLogStatsResponse> GetStatsAsync(
        Guid callerId,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default)
    {
        await EnsureStaffAsync(callerId, cancellationToken);

        var query = _unitOfWork.Context.ActivityLogs.AsNoTracking();
        if (from is not null)
        {
            query = query.Where(l => l.CreatedAt >= from);
        }

        if (to is not null)
        {
            query = query.Where(l => l.CreatedAt <= to);
        }

        var now = DateTime.UtcNow;
        var last24 = now.AddHours(-24);
        var last7 = now.AddDays(-7);

        var total = await query.CountAsync(cancellationToken);
        var count24 = await query.CountAsync(l => l.CreatedAt >= last24, cancellationToken);
        var count7 = await query.CountAsync(l => l.CreatedAt >= last7, cancellationToken);

        var byAction = await query
            .Where(l => l.Action != null)
            .GroupBy(l => l.Action!)
            .Select(g => new ActivityCountByActionResponse(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync(cancellationToken);

        return new ActivityLogStatsResponse(total, count24, count7, byAction);
    }

    public async Task<ActivityLogResponse> CreateAsync(
        Guid callerId,
        CreateActivityLogRequest request,
        CancellationToken cancellationToken = default)
    {
        var caller = await RequireProfileAsync(callerId, cancellationToken);
        if (!IsStaff(caller.Role))
        {
            throw new ActivityLogForbiddenException("Only admin, editor, or board can create activity logs manually.");
        }

        return await LogAsync(
            callerId,
            request.Action.Trim(),
            request.EntityType.Trim(),
            request.EntityId,
            request.OldData,
            request.NewData,
            cancellationToken);
    }

    public async Task<ActivityLogResponse> LogAsync(
        Guid? userId,
        string action,
        string entityType,
        Guid? entityId = null,
        string? oldData = null,
        string? newData = null,
        CancellationToken cancellationToken = default)
    {
        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldData = oldData,
            NewData = newData,
            CreatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(log, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await Project(FilteredQuery(null, null, null, null, null, null))
            .FirstAsync(l => l.Id == log.Id, cancellationToken);
    }

    private async Task<ActivityLogListResponse> QueryPagedAsync(
        Guid? userId,
        string? action,
        string? entityType,
        Guid? entityId,
        DateTime? from,
        DateTime? to,
        int page,
        int limit,
        CancellationToken cancellationToken)
    {
        page = NormalizePage(page);
        limit = NormalizeLimit(limit);

        var query = FilteredQuery(userId, action, entityType, entityId, from, to);
        var total = await query.CountAsync(cancellationToken);
        var pageItems = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var userIds = pageItems
            .Where(l => l.UserId is not null)
            .Select(l => l.UserId!.Value)
            .Distinct()
            .ToList();
        var names = userIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _unitOfWork.Context.Profiles
                .AsNoTracking()
                .Where(p => userIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.FullName, cancellationToken);

        var data = pageItems
            .Select(l => new ActivityLogResponse(
                l.Id,
                l.UserId,
                l.UserId is Guid uid && names.TryGetValue(uid, out var name) ? name : null,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.OldData,
                l.NewData,
                l.CreatedAt))
            .ToList();

        return new ActivityLogListResponse(data, total, page, limit);
    }

    private IQueryable<ActivityLog> FilteredQuery(
        Guid? userId,
        string? action,
        string? entityType,
        Guid? entityId,
        DateTime? from,
        DateTime? to)
    {
        var query = _unitOfWork.Context.ActivityLogs.AsNoTracking().AsQueryable();

        if (userId is not null)
        {
            query = query.Where(l => l.UserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var actionFilter = action.Trim();
            query = query.Where(l => l.Action != null && EF.Functions.ILike(l.Action, actionFilter));
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            var typeFilter = entityType.Trim();
            query = query.Where(l => l.EntityType != null && EF.Functions.ILike(l.EntityType, typeFilter));
        }

        if (entityId is not null)
        {
            query = query.Where(l => l.EntityId == entityId);
        }

        if (from is not null)
        {
            query = query.Where(l => l.CreatedAt >= from);
        }

        if (to is not null)
        {
            query = query.Where(l => l.CreatedAt <= to);
        }

        return query;
    }

    private static IQueryable<ActivityLogResponse> Project(IQueryable<ActivityLog> query) =>
        query
            .Include(l => l.User)
            .Select(l => new ActivityLogResponse(
                l.Id,
                l.UserId,
                l.User != null ? l.User.FullName : null,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.OldData,
                l.NewData,
                l.CreatedAt));

    private async Task<Profile> RequireProfileAsync(Guid callerId, CancellationToken cancellationToken) =>
        await ProfileRepository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
        ?? throw new ActivityLogForbiddenException("Caller profile not found.");

    private async Task EnsureStaffAsync(Guid callerId, CancellationToken cancellationToken)
    {
        var caller = await RequireProfileAsync(callerId, cancellationToken);
        if (!IsStaff(caller.Role))
        {
            throw new ActivityLogForbiddenException("Requires admin, editor, or board role.");
        }
    }

    private static bool CanViewLog(Profile caller, ActivityLogResponse log) =>
        IsStaff(caller.Role) || log.UserId == caller.Id;

    private static bool CanViewSeriesActivity(Profile caller, SeriesEntity series) =>
        IsStaff(caller.Role) || series.AuthorId == caller.Id || series.EditorId == caller.Id;

    private static bool IsStaff(ProfileRole role) =>
        role is ProfileRole.Admin or ProfileRole.Editor or ProfileRole.Board;

    private static int NormalizePage(int page) => page < 1 ? 1 : page;

    private static int NormalizeLimit(int limit) => limit is < 1 or > 100 ? 20 : limit;
}
