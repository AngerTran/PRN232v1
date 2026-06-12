using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using SeriesEntity = DAL.Models.Series;
using BLL.Services.Storage;
using BLL.Configuration;
using BLL.Dtos.Series;
using BLL.Services.Notifications;
using Microsoft.AspNetCore.Http;

namespace BLL.Services.Series;

public class SeriesService
{
  private const int DangerRankPositionThreshold = 30;

  private readonly UnitOfWork _unitOfWork;
  private readonly SupabaseStorageService _storage;
  private readonly SupabaseOptions _supabaseOptions;
  private readonly NotificationService _notificationService;
  private Repository<SeriesEntity> SeriesRepository => _unitOfWork.Repository<SeriesEntity>();
  private Repository<Chapter> ChapterRepository => _unitOfWork.Repository<Chapter>();
  private Repository<Profile> ProfileRepository => _unitOfWork.Repository<Profile>();

  public SeriesService(
    UnitOfWork unitOfWork,
    SupabaseStorageService storage,
    IOptions<SupabaseOptions> supabaseOptions,
    NotificationService notificationService)
  {
    _unitOfWork = unitOfWork;
    _storage = storage;
    _supabaseOptions = supabaseOptions.Value;
    _notificationService = notificationService;
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
      .Where(s => SeriesStatuses.PublicVisibleArray.Contains(s.Status));

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
      .Where(s => SeriesStatuses.PublicVisibleArray.Contains(s.Status) || s.AuthorId == callerId)
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
      // Cho phép cộng tác viên (assistant) xem series nếu họ được giao ít nhất một task thuộc series này.
      var hasTaskInSeries = await _unitOfWork.Context.Tasks
        .AsNoTracking()
        .AnyAsync(t => t.AssignedTo == caller.Id && t.Page.Chapter.SeriesId == id, cancellationToken);

      if (!hasTaskInSeries)
      {
        throw new SeriesForbiddenException("You do not have permission to view this series.");
      }
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
        && !await ProfileRepository.AnyAsync(p => p.Id == request.EditorId && p.Role == ProfileRole.Editor, cancellationToken))
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
      Status = SeriesStatus.Draft,
      PublishingFrequency = PublishingFrequencies.ParseOrDefault(request.PublishingFrequency),
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

    if (request.EditorId is not null)
    {
      if (!IsAdmin(caller.Role))
      {
        throw new SeriesForbiddenException("Chỉ admin mới có thể gán editor trực tiếp. Mangaka hãy gửi lời mời editor.");
      }

      if (!await ProfileRepository.AnyAsync(p => p.Id == request.EditorId && p.Role == ProfileRole.Editor, cancellationToken))
      {
        throw new ArgumentException("EditorId must reference a profile with role 'editor'.");
      }
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
      series.PublishingFrequency = PublishingFrequencies.ParseOrDefault(request.PublishingFrequency);
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

  public async Task<SeriesEditorInvitationResponse> InviteEditorAsync(
    Guid callerId,
    Guid seriesId,
    InviteSeriesEditorRequest request,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken)
      ?? throw new SeriesForbiddenException("Series not found.");

    if (!IsMangaka(caller.Role) || series.AuthorId != caller.Id)
    {
      throw new SeriesForbiddenException("Only the series author can invite an editor.");
    }

    if (!SeriesWorkflowRules.AllowsStudioProduction(series.Status))
    {
      throw new SeriesForbiddenException("Chỉ có thể mời editor sau khi series được hội đồng phê duyệt.");
    }

    if (series.EditorId is not null)
    {
      throw new SeriesForbiddenException("Series đã có editor phụ trách.");
    }

    if (!await ProfileRepository.AnyAsync(
        p => p.Id == request.EditorId && p.Role == ProfileRole.Editor && p.IsActive != false,
        cancellationToken))
    {
      throw new ArgumentException("EditorId must reference an active profile with role 'editor'.");
    }

    var invitation = await _unitOfWork.Context.SeriesEditorInvitations
      .Include(i => i.Series)
      .ThenInclude(s => s.Author)
      .Include(i => i.Editor)
      .FirstOrDefaultAsync(
        i => i.SeriesId == seriesId && i.EditorId == request.EditorId,
        cancellationToken);

    var shouldNotify = false;
    if (invitation is null)
    {
      invitation = new SeriesEditorInvitation
      {
        SeriesId = seriesId,
        EditorId = request.EditorId,
        Status = "pending",
        CreatedAt = DateTime.UtcNow
      };
      await _unitOfWork.Context.SeriesEditorInvitations.AddAsync(invitation, cancellationToken);
      invitation.Series = series;
      invitation.Editor = await ProfileRepository.GetByIdAsync(request.EditorId, cancellationToken: cancellationToken)
        ?? throw new ArgumentException("Editor profile not found.");
      shouldNotify = true;
    }
    else if (invitation.Status == "rejected")
    {
      invitation.Status = "pending";
      invitation.CreatedAt = DateTime.UtcNow;
      invitation.RespondedAt = null;
      shouldNotify = true;
    }
    else if (invitation.Status == "pending")
    {
      throw new ArgumentException("Lời mời đang chờ editor phản hồi.");
    }
    else
    {
      throw new ArgumentException("Editor đã chấp nhận lời mời cho series này.");
    }

    await _unitOfWork.SaveChangesAsync(cancellationToken);

    if (shouldNotify)
    {
      await _notificationService.CreateAsync(
        request.EditorId,
        "Lời mời phụ trách series",
        $"{caller.FullName} đã mời bạn phụ trách series \"{series.Title}\".",
        cancellationToken);
    }

    return MapEditorInvitation(invitation);
  }

  public async Task<IReadOnlyList<SeriesEditorInvitationResponse>> ListSentEditorInvitationsAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsMangaka(caller.Role))
    {
      throw new SeriesForbiddenException("Requires mangaka role.");
    }

    var invitations = await EditorInvitationQuery()
      .Where(i => i.Series.AuthorId == callerId)
      .OrderByDescending(i => i.CreatedAt)
      .ToListAsync(cancellationToken);

    return invitations.Select(MapEditorInvitation).ToList();
  }

  public async Task<IReadOnlyList<SeriesEditorInvitationResponse>> ListMyEditorInvitationsAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsEditor(caller.Role))
    {
      throw new SeriesForbiddenException("Requires editor role.");
    }

    var invitations = await EditorInvitationQuery()
      .Where(i => i.EditorId == callerId)
      .OrderByDescending(i => i.CreatedAt)
      .ToListAsync(cancellationToken);

    return invitations.Select(MapEditorInvitation).ToList();
  }

  public async Task<SeriesEditorInvitationResponse?> RespondToEditorInvitationAsync(
    Guid callerId,
    Guid seriesId,
    bool accept,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsEditor(caller.Role))
    {
      throw new SeriesForbiddenException("Requires editor role.");
    }

    var invitation = await EditorInvitationQuery(asNoTracking: false)
      .FirstOrDefaultAsync(i => i.SeriesId == seriesId && i.EditorId == callerId, cancellationToken);
    if (invitation is null)
    {
      return null;
    }

    if (invitation.Status != "pending")
    {
      throw new ArgumentException("Lời mời này đã được phản hồi.");
    }

    invitation.Status = accept ? "accepted" : "rejected";
    invitation.RespondedAt = DateTime.UtcNow;

    if (accept)
    {
      var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken)
        ?? throw new SeriesForbiddenException("Series not found.");
      if (series.EditorId is not null && series.EditorId != callerId)
      {
        throw new SeriesForbiddenException("Series đã có editor phụ trách.");
      }

      series.EditorId = callerId;
      series.UpdatedAt = DateTime.UtcNow;
      SeriesRepository.Update(series);
    }

    await _unitOfWork.SaveChangesAsync(cancellationToken);

    await _notificationService.CreateAsync(
      invitation.Series.AuthorId,
      accept ? "Editor đã chấp nhận lời mời" : "Editor đã từ chối lời mời",
      $"{caller.FullName} đã {(accept ? "chấp nhận" : "từ chối")} phụ trách series \"{invitation.Series.Title}\".",
      cancellationToken);

    return MapEditorInvitation(invitation);
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
    if (!IsAdmin(caller.Role) && !(isOwner && series.Status == SeriesStatus.Draft))
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

    var newStatus = SeriesStatuses.ParseOrThrow(request.Status);
    if (!CanChangeStatus(caller, series, newStatus))
    {
      throw new SeriesForbiddenException($"Role '{caller.Role}' cannot set status to '{SeriesStatuses.ToDbValue(newStatus)}' for this series.");
    }

    if (newStatus == SeriesStatus.PendingReview && series.Status != SeriesStatus.PendingReview)
    {
      var oldVotes = await _unitOfWork.Context.BoardVotes
        .Where(v => v.SeriesId == series.Id)
        .ToListAsync(cancellationToken);
      _unitOfWork.Context.BoardVotes.RemoveRange(oldVotes);
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
        SeriesStatuses.ToDbValue(r.Series.Status),
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
        SeriesStatuses.ToDbValue(series.Status),
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
      && series.Status == SeriesStatus.Publishing;

    return new SeriesStatsResponse(
      seriesId,
      series.Title,
      SeriesStatuses.ToDbValue(series.Status),
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
      // Cho phép cộng tác viên (assistant) xem chapter nếu họ được giao ít nhất một task trong chapter này.
      var hasTaskInChapter = await _unitOfWork.Context.Tasks
        .AsNoTracking()
        .AnyAsync(t => t.AssignedTo == caller.Id && t.Page.ChapterId == chapterId, cancellationToken);

      if (!hasTaskInChapter)
      {
        throw new SeriesForbiddenException("You do not have permission to view this chapter.");
      }
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

  public async Task<ChapterResponse?> UploadChapterManuscriptAsync(
    Guid callerId,
    Guid chapterId,
    IFormFile file,
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

    if (!IsAdmin(caller.Role) && !(IsMangaka(caller.Role) && chapter.Series.AuthorId == callerId))
    {
      throw new SeriesForbiddenException("Only the series author (mangaka) or admin can upload a chapter manuscript.");
    }

    var extension = Path.GetExtension(file.FileName);
    if (string.IsNullOrWhiteSpace(extension))
    {
      extension = ".bin";
    }

    var objectPath = $"chapters/{chapterId}/manuscript{extension.ToLowerInvariant()}";
    chapter.ManuscriptUrl = await _storage.UploadAsync(
      _supabaseOptions.ManuscriptsBucket,
      objectPath,
      file,
      cancellationToken);
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

    var newStatus = ChapterStatuses.ParseOrThrow(request.Status);
    if (!CanChangeChapterStatus(caller, chapter.Series, newStatus))
    {
      throw new SeriesForbiddenException($"Role '{caller.Role}' cannot set chapter status to '{ChapterStatuses.ToDbValue(newStatus)}'.");
    }

    chapter.Status = newStatus;
    chapter.UpdatedAt = DateTime.UtcNow;
    ChapterRepository.Update(chapter);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return MapChapterToDto(chapter);
  }

  public async Task<bool> DeleteChapterAsync(
    Guid callerId,
    Guid chapterId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var chapter = await _unitOfWork.Context.Chapters
      .Include(c => c.Series)
      .FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken);

    if (chapter is null)
    {
      return false;
    }

    var isAuthorDraft = IsMangaka(caller.Role)
      && chapter.Series.AuthorId == callerId
      && chapter.Status == ChapterStatus.Draft;
    if (!IsAdmin(caller.Role) && !isAuthorDraft)
    {
      throw new SeriesForbiddenException("Only admin can delete any chapter; mangaka can delete own draft chapters.");
    }

    ChapterRepository.Remove(chapter);
    await _unitOfWork.SaveChangesAsync(cancellationToken);
    return true;
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

    if (!IsAdmin(caller.Role))
    {
      try
      {
        SeriesWorkflowRules.EnsureAllowsChapterCreation(series.Status, request.ChapterNumber);
      }
      catch (InvalidOperationException ex)
      {
        throw new SeriesForbiddenException(ex.Message);
      }
    }

    if (await ChapterRepository.AnyAsync(
        c => c.SeriesId == seriesId && c.ChapterNumber == request.ChapterNumber,
        cancellationToken))
    {
      throw new ArgumentException($"Chapter number {request.ChapterNumber} already exists for this series.");
    }

    var now = DateTime.UtcNow;
    var deadline = request.Deadline;
    if (series.PublishingFrequency == PublishingFrequency.Weekly && request.ChapterNumber > 0)
    {
      var latestDeadline = await _unitOfWork.Context.Chapters
        .AsNoTracking()
        .Where(c => c.SeriesId == seriesId && c.ChapterNumber > 0 && c.Deadline != null)
        .MaxAsync(c => c.Deadline, cancellationToken);
      deadline = latestDeadline?.AddDays(7) ?? now.Date.AddDays(7);
    }

    var chapter = new Chapter
    {
      Id = Guid.NewGuid(),
      SeriesId = seriesId,
      ChapterNumber = request.ChapterNumber,
      Title = request.Title?.Trim(),
      ManuscriptUrl = request.ManuscriptUrl,
      Status = ChapterStatus.Draft,
      Deadline = deadline,
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
    var latestDangerRankings = rankings
      .GroupBy(r => r.SeriesId)
      .Select(g => g.OrderByDescending(r => r.IssueNumber).First())
      .Where(r => r.RankPosition >= DangerRankPositionThreshold)
      .ToList();
    var dangerSeriesIds = latestDangerRankings.Select(r => r.SeriesId).ToList();
    var handledDecisions = await _unitOfWork.Context.ActivityLogs
      .AsNoTracking()
      .Where(log => log.Action == ActivityActions.DangerDecision
        && log.EntityType == ActivityEntityTypes.Series
        && log.EntityId != null
        && dangerSeriesIds.Contains(log.EntityId.Value))
      .ToListAsync(cancellationToken);
    var atRiskSeriesIds = latestDangerRankings
      .Where(r => !handledDecisions.Any(log => log.EntityId == r.SeriesId
        && log.CreatedAt >= r.CreatedAt))
      .Select(x => x.SeriesId)
      .ToHashSet();

    var query = BuildSeriesQuery()
      .Where(s => s.Status == SeriesStatus.Publishing && atRiskSeriesIds.Contains(s.Id));

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
      SeriesStatuses.ToDbValue(s.Status),
      s.PublishingFrequency == null ? null : PublishingFrequencies.ToDbValue(s.PublishingFrequency.Value),
      s.CreatedAt,
      s.UpdatedAt);

  private static ChapterResponse MapChapterToDto(Chapter c) =>
    new(
      c.Id,
      c.SeriesId,
      c.ChapterNumber,
      c.Title,
      c.ManuscriptUrl,
      ChapterStatuses.ToDbValue(c.Status),
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
      SeriesStatuses.ToDbValue(s.Status),
      s.PublishingFrequency == null ? null : PublishingFrequencies.ToDbValue(s.PublishingFrequency.Value),
      s.CreatedAt,
      s.UpdatedAt);

  private static bool CanViewSeries(Profile caller, SeriesEntity series) =>
    IsStaff(caller.Role)
    || series.AuthorId == caller.Id
    || series.EditorId == caller.Id
    || SeriesStatuses.PublicVisibleValues.Contains(series.Status);

  private static bool CanModifySeries(Profile caller, SeriesEntity series) =>
    IsAdmin(caller.Role)
    || series.AuthorId == caller.Id
    || (IsEditor(caller.Role) && series.EditorId == caller.Id);

  private static bool CanModifyChapter(Profile caller, SeriesEntity series) => CanModifySeries(caller, series);

  private static bool CanChangeChapterStatus(Profile caller, SeriesEntity series, ChapterStatus newStatus)
  {
    if (IsAdmin(caller.Role) || IsBoard(caller.Role))
    {
      return true;
    }

    if (IsEditor(caller.Role) && (series.EditorId == caller.Id || series.EditorId is null))
    {
      return newStatus is ChapterStatus.Reviewing
        or ChapterStatus.Completed
        or ChapterStatus.Published
        or ChapterStatus.InProgress;
    }

    if (series.AuthorId == caller.Id && IsMangaka(caller.Role))
    {
      return newStatus is ChapterStatus.Draft
        or ChapterStatus.InProgress
        or ChapterStatus.Reviewing;
    }

    return false;
  }

  private static bool CanChangeStatus(Profile caller, SeriesEntity series, SeriesStatus newStatus)
  {
    if (IsAdmin(caller.Role))
    {
      return true;
    }

    if (IsEditor(caller.Role) && series.EditorId == caller.Id)
    {
      return newStatus is SeriesStatus.Publishing
        or SeriesStatus.Completed
        or SeriesStatus.Hiatus;
    }

    if (series.AuthorId == caller.Id && IsMangaka(caller.Role))
    {
      return newStatus is SeriesStatus.Draft
        or SeriesStatus.PendingReview
        or SeriesStatus.Hiatus;
    }

    return false;
  }

  private IQueryable<SeriesEditorInvitation> EditorInvitationQuery(bool asNoTracking = true)
  {
    var query = _unitOfWork.Context.SeriesEditorInvitations
      .Include(i => i.Series)
      .ThenInclude(s => s.Author)
      .Include(i => i.Editor)
      .AsQueryable();

    return asNoTracking ? query.AsNoTracking() : query;
  }

  private static SeriesEditorInvitationResponse MapEditorInvitation(SeriesEditorInvitation invitation) =>
    new(
      invitation.SeriesId,
      invitation.Series.Title,
      invitation.Series.AuthorId,
      invitation.Series.Author.FullName,
      invitation.EditorId,
      invitation.Editor.FullName,
      invitation.Status,
      invitation.CreatedAt,
      invitation.RespondedAt);

  private async Task<Profile> RequireCallerAsync(Guid callerId, CancellationToken cancellationToken) =>
    await ProfileRepository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
    ?? throw new SeriesForbiddenException("Caller profile not found.");

  private async Task EnsureRoleAsync(Guid callerId, string requiredRole, CancellationToken cancellationToken)
  {
    if (!ProfileRoles.TryParse(requiredRole, out var expected))
    {
      throw new SeriesForbiddenException($"Invalid role '{requiredRole}'.");
    }

    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (caller.Role != expected)
    {
      throw new SeriesForbiddenException($"Requires role '{requiredRole}'.");
    }
  }

  private static bool IsAdmin(ProfileRole role) =>
    role == ProfileRole.Admin;

  private static bool IsMangaka(ProfileRole role) =>
    role == ProfileRole.Mangaka;

  private static bool IsEditor(ProfileRole role) =>
    role == ProfileRole.Editor;

  private static bool IsBoard(ProfileRole role) =>
    role == ProfileRole.Board;

  private static bool IsStaff(ProfileRole role) =>
    IsAdmin(role) || IsEditor(role) || IsBoard(role);
}
