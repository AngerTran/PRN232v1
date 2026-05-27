using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PRN232v1.Common;
using PRN232v1.Configuration;
using PRN232v1.Dtos.Series;
using PRN232v1.Models;
using PRN232v1.Repositories;
using PRN232v1.Services.Storage;
using SeriesEntity = PRN232v1.Models.Series;

namespace PRN232v1.Services.Series;

public class SeriesService
{
  private const int DangerRankPositionThreshold = 30;

  private readonly UnitOfWork _unitOfWork;
  private readonly SupabaseStorageService _storage;
  private readonly SupabaseOptions _supabaseOptions;
  private Repository<SeriesEntity> SeriesRepository => _unitOfWork.Repository<SeriesEntity>();
  private Repository<Chapter> ChapterRepository => _unitOfWork.Repository<Chapter>();
  private Repository<Profile> ProfileRepository => _unitOfWork.Repository<Profile>();

  public SeriesService(
    UnitOfWork unitOfWork,
    SupabaseStorageService storage,
    IOptions<SupabaseOptions> supabaseOptions)
  {
    _unitOfWork = unitOfWork;
    _storage = storage;
    _supabaseOptions = supabaseOptions.Value;
  }

  public async Task<SeriesListResponse> ListCatalogAsync(
    string? genre,
    int page,
    int limit,
    CancellationToken cancellationToken = default)
  {
    page = page < 1 ? 1 : page;
    limit = limit is < 1 or > 100 ? 10 : limit;

    var query = BuildSeriesQuery()
      .Where(s => SeriesStatuses.PublicVisible.Contains(s.Status));

    if (!string.IsNullOrWhiteSpace(genre))
    {
      var genreFilter = genre.Trim();
      query = query.Where(s => s.Genre != null && EF.Functions.ILike(s.Genre, genreFilter));
    }

    var total = await query.CountAsync(cancellationToken);
    var data = await query
      .OrderByDescending(s => s.UpdatedAt)
      .Skip((page - 1) * limit)
      .Take(limit)
      .Select(MapProjection())
      .ToListAsync(cancellationToken);

    return new SeriesListResponse(data, total, page, limit);
  }

  public async Task<IReadOnlyList<SeriesResponse>> ListAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var query = BuildSeriesQuery();

    if (IsStaff(caller.Role))
    {
      return await query
        .OrderByDescending(s => s.UpdatedAt)
        .Select(MapProjection())
        .ToListAsync(cancellationToken);
    }

    return await query
      .Where(s => SeriesStatuses.PublicVisible.Contains(s.Status) || s.AuthorId == callerId)
      .OrderByDescending(s => s.UpdatedAt)
      .Select(MapProjection())
      .ToListAsync(cancellationToken);
  }

  public async Task<IReadOnlyList<SeriesResponse>> ListMySeriesAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    await EnsureRoleAsync(callerId, ProfileRoles.Mangaka, cancellationToken);

    return await BuildSeriesQuery()
      .Where(s => s.AuthorId == callerId)
      .OrderByDescending(s => s.UpdatedAt)
      .Select(MapProjection())
      .ToListAsync(cancellationToken);
  }

  public async Task<SeriesResponse?> GetByIdAsync(
    Guid callerId,
    Guid id,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await BuildSeriesQuery()
      .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    if (series is null)
    {
      return null;
    }

    if (!CanViewSeries(caller, series))
    {
      throw new SeriesForbiddenException("You do not have permission to view this series.");
    }

    return MapToDto(series);
  }

  public async Task<SeriesResponse> CreateAsync(
    Guid callerId,
    CreateSeriesRequest request,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsMangaka(caller.Role) && !IsAdmin(caller.Role))
    {
      throw new SeriesForbiddenException("Only mangaka or admin can create a series.");
    }

    if (request.PublishingFrequency is not null && !PublishingFrequencies.IsValid(request.PublishingFrequency))
    {
      throw new ArgumentException($"Invalid publishing frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
    }

    if (request.EditorId is not null && !IsAdmin(caller.Role))
    {
      throw new SeriesForbiddenException("Only admin can assign an editor when creating a series.");
    }

    if (request.EditorId is not null
        && !await ProfileRepository.AnyAsync(p => p.Id == request.EditorId && p.Role == ProfileRoles.Editor, cancellationToken))
    {
      throw new ArgumentException("EditorId must reference a profile with role 'editor'.");
    }

    var now = DateTime.UtcNow;
    var series = new SeriesEntity
    {
      Id = Guid.NewGuid(),
      Title = request.Title.Trim(),
      Description = request.Description,
      Genre = request.Genre,
      TargetAudience = request.TargetAudience,
      CoverImageUrl = request.CoverImageUrl,
      AuthorId = callerId,
      EditorId = request.EditorId,
      Status = SeriesStatuses.Draft,
      PublishingFrequency = request.PublishingFrequency ?? PublishingFrequencies.Weekly,
      CreatedAt = now,
      UpdatedAt = now
    };

    await SeriesRepository.AddAsync(series, cancellationToken);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return (await GetByIdAsync(callerId, series.Id, cancellationToken))!;
  }

  public async Task<SeriesResponse?> UpdateAsync(
    Guid callerId,
    Guid id,
    UpdateSeriesRequest request,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!CanModifySeries(caller, series))
    {
      throw new SeriesForbiddenException("You do not have permission to update this series.");
    }

    if (request.PublishingFrequency is not null && !PublishingFrequencies.IsValid(request.PublishingFrequency))
    {
      throw new ArgumentException($"Invalid publishing frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
    }

    if (request.EditorId is not null && !IsAdmin(caller.Role))
    {
      throw new SeriesForbiddenException("Only admin can assign or change the editor.");
    }

    if (request.EditorId is not null
        && !await ProfileRepository.AnyAsync(p => p.Id == request.EditorId && p.Role == ProfileRoles.Editor, cancellationToken))
    {
      throw new ArgumentException("EditorId must reference a profile with role 'editor'.");
    }

    if (!string.IsNullOrWhiteSpace(request.Title))
    {
      series.Title = request.Title.Trim();
    }

    if (request.Description is not null)
    {
      series.Description = request.Description;
    }

    if (request.Genre is not null)
    {
      series.Genre = request.Genre;
    }

    if (request.TargetAudience is not null)
    {
      series.TargetAudience = request.TargetAudience;
    }

    if (request.CoverImageUrl is not null)
    {
      series.CoverImageUrl = request.CoverImageUrl;
    }

    if (request.PublishingFrequency is not null)
    {
      series.PublishingFrequency = request.PublishingFrequency;
    }

    if (request.EditorId is not null)
    {
      series.EditorId = request.EditorId;
    }

    series.UpdatedAt = DateTime.UtcNow;
    SeriesRepository.Update(series);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return await GetByIdAsync(callerId, id, cancellationToken);
  }

  public async Task<bool> DeleteAsync(Guid callerId, Guid id, CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
    if (series is null)
    {
      return false;
    }

    var isOwner = series.AuthorId == callerId;
    if (!IsAdmin(caller.Role) && !(isOwner && series.Status == SeriesStatuses.Draft))
    {
      throw new SeriesForbiddenException("Only admin can delete any series; mangaka can delete own series in draft status.");
    }

    SeriesRepository.Remove(series);
    await _unitOfWork.SaveChangesAsync(cancellationToken);
    return true;
  }

  public async Task<SeriesResponse?> UpdateStatusAsync(
    Guid callerId,
    Guid id,
    UpdateSeriesStatusRequest request,
    CancellationToken cancellationToken = default)
  {
    if (!SeriesStatuses.IsValid(request.Status))
    {
      throw new ArgumentException($"Invalid status. Allowed: {string.Join(", ", SeriesStatuses.All)}.");
    }

    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
    if (series is null)
    {
      return null;
    }

    var newStatus = request.Status.Trim();
    if (!CanChangeStatus(caller, series, newStatus))
    {
      throw new SeriesForbiddenException($"Role '{caller.Role}' cannot set status to '{newStatus}' for this series.");
    }

    series.Status = newStatus;
    series.UpdatedAt = DateTime.UtcNow;
    SeriesRepository.Update(series);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return await GetByIdAsync(callerId, id, cancellationToken);
  }

  public async Task<IReadOnlyList<SeriesRankingItemResponse>> GetRankingAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    _ = await RequireCallerAsync(callerId, cancellationToken);

    var rankings = await _unitOfWork.Context.Rankings
      .AsNoTracking()
      .Include(r => r.Series)
      .ToListAsync(cancellationToken);

    return rankings
      .GroupBy(r => r.SeriesId)
      .Select(g => g.OrderByDescending(r => r.IssueNumber).First())
      .Select(r => new SeriesRankingItemResponse(
        r.SeriesId,
        r.Series.Title,
        r.Series.Status,
        r.IssueNumber,
        r.RankPosition,
        r.VoteCount,
        r.PopularityScore,
        r.CreatedAt))
      .OrderBy(x => x.RankPosition)
      .ThenBy(x => x.Title)
      .ToList();
  }

  public async Task<SeriesStatsResponse?> GetStatsAsync(
    Guid callerId,
    Guid seriesId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, cancellationToken: cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!CanViewSeries(caller, series))
    {
      throw new SeriesForbiddenException("You do not have permission to view stats for this series.");
    }

    var chapterCount = await _unitOfWork.Context.Chapters
      .AsNoTracking()
      .CountAsync(c => c.SeriesId == seriesId, cancellationToken);

    var pageCount = await _unitOfWork.Context.Pages
      .AsNoTracking()
      .CountAsync(p => p.Chapter.SeriesId == seriesId, cancellationToken);

    var latestRanking = await _unitOfWork.Context.Rankings
      .AsNoTracking()
      .Where(r => r.SeriesId == seriesId)
      .OrderByDescending(r => r.IssueNumber)
      .Select(r => new SeriesRankingItemResponse(
        r.SeriesId,
        series.Title,
        series.Status,
        r.IssueNumber,
        r.RankPosition,
        r.VoteCount,
        r.PopularityScore,
        r.CreatedAt))
      .FirstOrDefaultAsync(cancellationToken);

    var votes = await _unitOfWork.Context.BoardVotes
      .AsNoTracking()
      .Where(v => v.SeriesId == seriesId)
      .ToListAsync(cancellationToken);

    var scheduleCount = await _unitOfWork.Context.PublishingSchedules
      .AsNoTracking()
      .CountAsync(s => s.SeriesId == seriesId, cancellationToken);

    var inDangerZone = latestRanking is not null
      && latestRanking.RankPosition >= DangerRankPositionThreshold
      && series.Status == SeriesStatuses.Publishing;

    return new SeriesStatsResponse(
      seriesId,
      series.Title,
      series.Status,
      chapterCount,
      pageCount,
      latestRanking,
      votes.Count,
      votes.Count(v => string.Equals(v.Decision, VoteDecisions.Approve, StringComparison.Ordinal)),
      votes.Count(v => string.Equals(v.Decision, VoteDecisions.Reject, StringComparison.Ordinal)),
      scheduleCount,
      inDangerZone);
  }

  public async Task<SeriesResponse?> UploadCoverAsync(
    Guid callerId,
    Guid seriesId,
    IFormFile file,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!CanModifySeries(caller, series))
    {
      throw new SeriesForbiddenException("You do not have permission to update this series cover.");
    }

    var extension = Path.GetExtension(file.FileName);
    if (string.IsNullOrWhiteSpace(extension))
    {
      extension = ".jpg";
    }

    var objectPath = $"series/{seriesId}/cover{extension.ToLowerInvariant()}";
    var coverUrl = await _storage.UploadAsync(
      _supabaseOptions.SeriesCoversBucket,
      objectPath,
      file,
      cancellationToken);

    series.CoverImageUrl = coverUrl;
    series.UpdatedAt = DateTime.UtcNow;
    SeriesRepository.Update(series);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return await GetByIdAsync(callerId, seriesId, cancellationToken);
  }

  public async Task<ChapterResponse?> GetChapterByIdAsync(
    Guid callerId,
    Guid chapterId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var chapter = await _unitOfWork.Context.Chapters
      .AsNoTracking()
      .Include(c => c.Series)
      .FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken);

    if (chapter is null)
    {
      return null;
    }

    if (!CanViewSeries(caller, chapter.Series))
    {
      throw new SeriesForbiddenException("You do not have permission to view this chapter.");
    }

    return MapChapterToDto(chapter);
  }

  public async Task<ChapterResponse?> UpdateChapterAsync(
    Guid callerId,
    Guid chapterId,
    UpdateChapterRequest request,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var chapter = await _unitOfWork.Context.Chapters
      .Include(c => c.Series)
      .FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken);

    if (chapter is null)
    {
      return null;
    }

    if (!CanModifyChapter(caller, chapter.Series))
    {
      throw new SeriesForbiddenException("You do not have permission to update this chapter.");
    }

    if (request.Title is not null)
    {
      chapter.Title = request.Title.Trim();
    }

    if (request.ManuscriptUrl is not null)
    {
      chapter.ManuscriptUrl = request.ManuscriptUrl;
    }

    if (request.Deadline is not null)
    {
      chapter.Deadline = request.Deadline;
    }

    if (request.ReleaseDate is not null)
    {
      chapter.ReleaseDate = request.ReleaseDate;
    }

    chapter.UpdatedAt = DateTime.UtcNow;
    ChapterRepository.Update(chapter);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return MapChapterToDto(chapter);
  }

  public async Task<ChapterResponse?> UpdateChapterStatusAsync(
    Guid callerId,
    Guid chapterId,
    UpdateChapterStatusRequest request,
    CancellationToken cancellationToken = default)
  {
    if (!ChapterStatuses.IsValid(request.Status))
    {
      throw new ArgumentException($"Invalid chapter status. Allowed: {string.Join(", ", ChapterStatuses.All)}.");
    }

    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var chapter = await _unitOfWork.Context.Chapters
      .Include(c => c.Series)
      .FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken);

    if (chapter is null)
    {
      return null;
    }

    var newStatus = request.Status.Trim();
    if (!CanChangeChapterStatus(caller, chapter.Series, newStatus))
    {
      throw new SeriesForbiddenException($"Role '{caller.Role}' cannot set chapter status to '{newStatus}'.");
    }

    chapter.Status = newStatus;
    chapter.UpdatedAt = DateTime.UtcNow;
    ChapterRepository.Update(chapter);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return MapChapterToDto(chapter);
  }

  public async Task<IReadOnlyList<ChapterResponse>?> ListChaptersAsync(
    Guid callerId,
    Guid seriesId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, cancellationToken: cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!CanViewSeries(caller, series))
    {
      throw new SeriesForbiddenException("You do not have permission to view chapters for this series.");
    }

    var chapters = await _unitOfWork.Context.Chapters
      .AsNoTracking()
      .Where(c => c.SeriesId == seriesId)
      .OrderBy(c => c.ChapterNumber)
      .ToListAsync(cancellationToken);

    return chapters.Select(MapChapterToDto).ToList();
  }

  public async Task<ChapterResponse?> CreateChapterAsync(
    Guid callerId,
    Guid seriesId,
    CreateChapterRequest request,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!IsAdmin(caller.Role) && !(IsMangaka(caller.Role) && series.AuthorId == callerId))
    {
      throw new SeriesForbiddenException("Only the series author (mangaka) or admin can create chapters.");
    }

    if (await ChapterRepository.AnyAsync(
        c => c.SeriesId == seriesId && c.ChapterNumber == request.ChapterNumber,
        cancellationToken))
    {
      throw new ArgumentException($"Chapter number {request.ChapterNumber} already exists for this series.");
    }

    var now = DateTime.UtcNow;
    var chapter = new Chapter
    {
      Id = Guid.NewGuid(),
      SeriesId = seriesId,
      ChapterNumber = request.ChapterNumber,
      Title = request.Title?.Trim(),
      ManuscriptUrl = request.ManuscriptUrl,
      Status = ChapterStatuses.Draft,
      Deadline = request.Deadline,
      ReleaseDate = request.ReleaseDate,
      CreatedAt = now,
      UpdatedAt = now
    };

    await ChapterRepository.AddAsync(chapter, cancellationToken);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return MapChapterToDto(chapter);
  }

  public async Task<IReadOnlyList<SeriesResponse>> GetDangerZoneAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsStaff(caller.Role) && !IsMangaka(caller.Role))
    {
      throw new SeriesForbiddenException("Requires mangaka, editor, board, or admin role.");
    }

    var rankings = await _unitOfWork.Context.Rankings.AsNoTracking().ToListAsync(cancellationToken);
    var atRiskSeriesIds = rankings
      .GroupBy(r => r.SeriesId)
      .Select(g => new
      {
        SeriesId = g.Key,
        RankPosition = g.OrderByDescending(r => r.IssueNumber).First().RankPosition
      })
      .Where(x => x.RankPosition >= DangerRankPositionThreshold)
      .Select(x => x.SeriesId)
      .ToHashSet();

    var query = BuildSeriesQuery()
      .Where(s => s.Status == SeriesStatuses.Publishing && atRiskSeriesIds.Contains(s.Id));

    if (IsMangaka(caller.Role) && !IsStaff(caller.Role))
    {
      query = query.Where(s => s.AuthorId == callerId);
    }

    return await query
      .OrderByDescending(s => s.UpdatedAt)
      .Select(MapProjection())
      .ToListAsync(cancellationToken);
  }

  private IQueryable<SeriesEntity> BuildSeriesQuery() =>
    _unitOfWork.Context.Series
      .AsNoTracking()
      .Include(s => s.Author)
      .Include(s => s.Editor);

  private static System.Linq.Expressions.Expression<Func<SeriesEntity, SeriesResponse>> MapProjection() =>
    s => new SeriesResponse(
      s.Id,
      s.Title,
      s.Description,
      s.Genre,
      s.TargetAudience,
      s.CoverImageUrl,
      s.AuthorId,
      s.Author.FullName,
      s.EditorId,
      s.Editor != null ? s.Editor.FullName : null,
      s.Status,
      s.PublishingFrequency,
      s.CreatedAt,
      s.UpdatedAt);

  private static ChapterResponse MapChapterToDto(Chapter c) =>
    new(
      c.Id,
      c.SeriesId,
      c.ChapterNumber,
      c.Title,
      c.ManuscriptUrl,
      c.Status,
      c.Deadline,
      c.ReleaseDate,
      c.CreatedAt,
      c.UpdatedAt);

  private static SeriesResponse MapToDto(SeriesEntity s) =>
    new(
      s.Id,
      s.Title,
      s.Description,
      s.Genre,
      s.TargetAudience,
      s.CoverImageUrl,
      s.AuthorId,
      s.Author.FullName,
      s.EditorId,
      s.Editor?.FullName,
      s.Status,
      s.PublishingFrequency,
      s.CreatedAt,
      s.UpdatedAt);

  private static bool CanViewSeries(Profile caller, SeriesEntity series) =>
    IsStaff(caller.Role)
    || series.AuthorId == caller.Id
    || series.EditorId == caller.Id
    || SeriesStatuses.PublicVisible.Contains(series.Status);

  private static bool CanModifySeries(Profile caller, SeriesEntity series) =>
    IsAdmin(caller.Role)
    || series.AuthorId == caller.Id
    || (IsEditor(caller.Role) && series.EditorId == caller.Id);

  private static bool CanModifyChapter(Profile caller, SeriesEntity series) => CanModifySeries(caller, series);

  private static bool CanChangeChapterStatus(Profile caller, SeriesEntity series, string newStatus)
  {
    if (IsAdmin(caller.Role) || IsBoard(caller.Role))
    {
      return true;
    }

    if (IsEditor(caller.Role) && (series.EditorId == caller.Id || series.EditorId is null))
    {
      return newStatus is ChapterStatuses.Reviewing
        or ChapterStatuses.Completed
        or ChapterStatuses.Published
        or ChapterStatuses.InProgress;
    }

    if (series.AuthorId == caller.Id && IsMangaka(caller.Role))
    {
      return newStatus is ChapterStatuses.Draft
        or ChapterStatuses.InProgress
        or ChapterStatuses.Reviewing;
    }

    return false;
  }

  private static bool CanChangeStatus(Profile caller, SeriesEntity series, string newStatus)
  {
    if (IsAdmin(caller.Role) || IsBoard(caller.Role))
    {
      return true;
    }

    if (IsEditor(caller.Role) && (series.EditorId == caller.Id || series.EditorId is null))
    {
      return newStatus is SeriesStatuses.Approved
        or SeriesStatuses.Publishing
        or SeriesStatuses.Completed
        or SeriesStatuses.Hiatus
        or SeriesStatuses.PendingReview;
    }

    if (series.AuthorId == caller.Id && IsMangaka(caller.Role))
    {
      return newStatus is SeriesStatuses.Draft
        or SeriesStatuses.PendingReview
        or SeriesStatuses.Hiatus;
    }

    return false;
  }

  private async Task<Profile> RequireCallerAsync(Guid callerId, CancellationToken cancellationToken) =>
    await ProfileRepository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
    ?? throw new SeriesForbiddenException("Caller profile not found.");

  private async Task EnsureRoleAsync(Guid callerId, string requiredRole, CancellationToken cancellationToken)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (caller.Role != requiredRole)
    {
      throw new SeriesForbiddenException($"Requires role '{requiredRole}'.");
    }
  }

  private static bool IsAdmin(string role) =>
    string.Equals(role, ProfileRoles.Admin, StringComparison.OrdinalIgnoreCase);

  private static bool IsMangaka(string role) =>
    string.Equals(role, ProfileRoles.Mangaka, StringComparison.OrdinalIgnoreCase);

  private static bool IsEditor(string role) =>
    string.Equals(role, ProfileRoles.Editor, StringComparison.OrdinalIgnoreCase);

  private static bool IsBoard(string role) =>
    string.Equals(role, ProfileRoles.Board, StringComparison.OrdinalIgnoreCase);

  private static bool IsStaff(string role) =>
    IsAdmin(role) || IsEditor(role) || IsBoard(role);
}
