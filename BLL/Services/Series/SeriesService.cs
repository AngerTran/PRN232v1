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
using BLL.Common;
using Microsoft.AspNetCore.Http;

namespace BLL.Services.Series;

public class SeriesService
{
  private const int DangerRankPositionThreshold = 30;

  private readonly UnitOfWork _unitOfWork;
  private readonly SupabaseStorageService _storage;
  private readonly SupabaseOptions _supabaseOptions;
  private readonly NotificationService _notificationService;
  private readonly Board.BoardService _boardService;
  private Repository<SeriesEntity> SeriesRepository => _unitOfWork.Repository<SeriesEntity>();
  private Repository<Chapter> ChapterRepository => _unitOfWork.Repository<Chapter>();
  private Repository<Profile> ProfileRepository => _unitOfWork.Repository<Profile>();

  public SeriesService(
    UnitOfWork unitOfWork,
    SupabaseStorageService storage,
    IOptions<SupabaseOptions> supabaseOptions,
    NotificationService notificationService,
    Board.BoardService boardService)
  {
    _unitOfWork = unitOfWork;
    _storage = storage;
    _supabaseOptions = supabaseOptions.Value;
    _notificationService = notificationService;
    _boardService = boardService;
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
    await PromoteScheduledSeriesToPublishingAsync(cancellationToken);
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
    await PromoteScheduledSeriesToPublishingAsync(cancellationToken);

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
    await PromoteScheduledSeriesToPublishingAsync(cancellationToken, id);

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
    await EnsureSeriesTaskPriceRowsAsync(series.Id, cancellationToken);

    return (await GetByIdAsync(callerId, series.Id, cancellationToken))!;
  }

  private async Task EnsureSeriesTaskPriceRowsAsync(Guid seriesId, CancellationToken cancellationToken)
  {
    var templates = await _unitOfWork.Context.TaskPriceTemplates
      .AsNoTracking()
      .Where(t => t.IsActive)
      .ToListAsync(cancellationToken);

    if (templates.Count == 0)
    {
      return;
    }

    var existing = await _unitOfWork.Context.SeriesTaskPrices
      .Where(x => x.SeriesId == seriesId)
      .Select(x => x.TaskType)
      .ToListAsync(cancellationToken);

    var existingTypes = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
    var now = DateTime.UtcNow;

    foreach (var template in templates)
    {
      if (existingTypes.Contains(template.TaskType))
      {
        continue;
      }

      await _unitOfWork.Context.SeriesTaskPrices.AddAsync(new SeriesTaskPrice
      {
        Id = Guid.NewGuid(),
        SeriesId = seriesId,
        TaskType = template.TaskType,
        OfficialPrice = template.DefaultPrice,
        CreatedAt = now,
        UpdatedAt = now
      }, cancellationToken);
    }

    await _unitOfWork.SaveChangesAsync(cancellationToken);
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
        throw new SeriesForbiddenException("Chỉ admin được gán editor qua API cập nhật series. Board dùng endpoint gán editor.");
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

  public async Task<SeriesBoardReviewInvitationResponse> InviteBoardMemberAsync(
    Guid callerId,
    Guid seriesId,
    InviteSeriesBoardMemberRequest request,
    CancellationToken cancellationToken = default)
  {
    throw new SeriesForbiddenException(
      "Lời mời board đã tắt — hệ thống dùng 3 board cố định được gán tự động khi nộp duyệt.");
  }

  public async Task<IReadOnlyList<SeriesBoardReviewInvitationResponse>> ListSentBoardReviewInvitationsAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsMangaka(caller.Role))
    {
      throw new SeriesForbiddenException("Requires mangaka role.");
    }

    var invitations = await BoardInvitationQuery()
      .Where(i => i.Series.AuthorId == callerId)
      .OrderByDescending(i => i.CreatedAt)
      .ToListAsync(cancellationToken);

    return invitations.Select(MapBoardInvitation).ToList();
  }

  public async Task<IReadOnlyList<SeriesBoardReviewInvitationResponse>> ListBoardReviewInvitationsForSeriesAsync(
    Guid callerId,
    Guid seriesId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, cancellationToken: cancellationToken)
      ?? throw new SeriesForbiddenException("Series not found.");

    if (!IsStaff(caller.Role) && series.AuthorId != caller.Id)
    {
      throw new SeriesForbiddenException("Forbidden.");
    }

    var invitations = await BoardInvitationQuery()
      .Where(i => i.SeriesId == seriesId)
      .OrderByDescending(i => i.CreatedAt)
      .ToListAsync(cancellationToken);

    return invitations.Select(MapBoardInvitation).ToList();
  }

  public async Task<IReadOnlyList<SeriesBoardReviewInvitationResponse>> ListMyBoardReviewInvitationsAsync(
    Guid callerId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsBoard(caller.Role))
    {
      throw new SeriesForbiddenException("Requires board role.");
    }

    var invitations = await BoardInvitationQuery()
      .Where(i => i.BoardMemberId == callerId)
      .OrderByDescending(i => i.CreatedAt)
      .ToListAsync(cancellationToken);

    return invitations.Select(MapBoardInvitation).ToList();
  }

  public async Task<SeriesBoardReviewInvitationResponse?> RespondToBoardReviewInvitationAsync(
    Guid callerId,
    Guid seriesId,
    bool accept,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    if (!IsBoard(caller.Role))
    {
      throw new SeriesForbiddenException("Requires board role.");
    }

    var invitation = await BoardInvitationQuery(asNoTracking: false)
      .FirstOrDefaultAsync(i => i.SeriesId == seriesId && i.BoardMemberId == callerId, cancellationToken);
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
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    await _boardService.RecordInvitationDecisionAsync(seriesId, callerId, accept, cancellationToken);

    await _notificationService.CreateAsync(
      invitation.Series.AuthorId,
      accept ? "Board đã chấp nhận xét duyệt" : "Board đã từ chối xét duyệt",
      $"{caller.FullName} đã {(accept ? "chấp nhận" : "từ chối")} xét duyệt series \"{invitation.Series.Title}\".",
      WorkflowNotificationPaths.MangakaSeries(seriesId),
      WorkflowNotificationPaths.CategorySubmission,
      cancellationToken: cancellationToken);

    return MapBoardInvitation(invitation);
  }

  public async Task<SeriesBoardReviewStatusResponse?> GetBoardReviewStatusAsync(
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
      throw new SeriesForbiddenException("Forbidden.");
    }

    await _boardService.ExpireStalePendingReviewsAsync(cancellationToken);
    series = await SeriesRepository.GetByIdAsync(seriesId, cancellationToken: cancellationToken);
    if (series is null)
    {
      return null;
    }

    var votes = await _unitOfWork.Context.BoardVotes
      .AsNoTracking()
      .Where(v => v.SeriesId == seriesId)
      .ToListAsync(cancellationToken);
    var pendingInvitations = await _unitOfWork.Context.SeriesBoardReviewInvitations
      .AsNoTracking()
      .CountAsync(i => i.SeriesId == seriesId && i.Status == "pending", cancellationToken);
    var claims = await _unitOfWork.Context.SeriesBoardReviewClaims
      .AsNoTracking()
      .Include(c => c.BoardMember)
      .Where(c => c.SeriesId == seriesId)
      .OrderByDescending(c => c.IsLead)
      .ThenBy(c => c.ClaimedAt)
      .ToListAsync(cancellationToken);
    var claimedReviewers = claims
      .Select(c => new BoardReviewerSummaryResponse(
        c.BoardMemberId,
        c.BoardMember?.FullName ?? "Board",
        c.Source ?? "public",
        c.IsLead))
      .ToList();
    var votedCount = votes.Where(v => v.BoardMemberId != null).Select(v => v.BoardMemberId!.Value).Distinct().Count();
    var approveVotes = votes.Count(v => v.Decision == VoteDecisions.Approve);
    var rejectVotes = votes.Count(v => v.Decision == VoteDecisions.Reject);
    var requiredVotes = Board.BoardService.MinimumBoardVotesForDecision;
    var expiresAt = series.SubmittedForReviewAt?.AddHours(Board.BoardService.ReviewExpiryHours);
    var occupiedSlots = claims.Count + pendingInvitations;

    return new SeriesBoardReviewStatusResponse(
      seriesId,
      approveVotes,
      rejectVotes,
      votedCount,
      requiredVotes,
      pendingInvitations,
      Math.Max(0, SeriesReviewRules.MaxActiveReviewSlots - occupiedSlots),
      series.SubmittedForReviewAt,
      expiresAt,
      votedCount >= requiredVotes,
      claims.Count,
      claimedReviewers);
  }

  public async Task<SeriesTeamResponse?> GetTeamAsync(
    Guid callerId,
    Guid seriesId,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await _unitOfWork.Context.Series
      .AsNoTracking()
      .Include(s => s.Author)
      .Include(s => s.Editor)
      .FirstOrDefaultAsync(s => s.Id == seriesId, cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!CanViewSeries(caller, series))
    {
      throw new SeriesForbiddenException("Forbidden.");
    }

    var boardReviewers = await _unitOfWork.Context.SeriesBoardReviewClaims
      .AsNoTracking()
      .Include(c => c.BoardMember)
      .Where(c => c.SeriesId == seriesId)
      .OrderByDescending(c => c.IsLead)
      .ThenBy(c => c.ClaimedAt)
      .Select(c => new SeriesTeamMemberResponse(
        c.BoardMemberId,
        c.BoardMember.FullName,
        c.IsLead ? "board_lead" : "board"))
      .ToListAsync(cancellationToken);

    var assistants = await _unitOfWork.Context.MangakaAssistants
      .AsNoTracking()
      .Where(link => link.MangakaId == series.AuthorId
        && link.Status == "accepted"
        && link.Assistant.Role == ProfileRole.Assistant
        && link.Assistant.IsActive != false)
      .OrderBy(link => link.Assistant.FullName)
      .Select(link => new SeriesTeamMemberResponse(
        link.AssistantId,
        link.Assistant.FullName,
        "assistant"))
      .ToListAsync(cancellationToken);

    return new SeriesTeamResponse(
      new SeriesTeamMemberResponse(series.AuthorId, series.Author.FullName, "mangaka"),
      series.EditorId is Guid editorId && series.Editor is not null
        ? new SeriesTeamMemberResponse(editorId, series.Editor.FullName, "editor")
        : null,
      boardReviewers,
      assistants);
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

    // Admin / xóa cứng: dọn phụ thuộc trước để tránh lỗi FK khi cascade DB chưa đủ.
    await _unitOfWork.Context.BoardVotes
      .Where(v => v.SeriesId == id)
      .ExecuteDeleteAsync(cancellationToken);
    await _unitOfWork.Context.SeriesBoardReviewInvitations
      .Where(i => i.SeriesId == id)
      .ExecuteDeleteAsync(cancellationToken);
    await _unitOfWork.Context.SeriesBoardReviewClaims
      .Where(c => c.SeriesId == id)
      .ExecuteDeleteAsync(cancellationToken);
    await _unitOfWork.Context.SeriesEditorInvitations
      .Where(i => i.SeriesId == id)
      .ExecuteDeleteAsync(cancellationToken);
    await _unitOfWork.Context.PublishingSchedules
      .Where(s => s.SeriesId == id)
      .ExecuteDeleteAsync(cancellationToken);
    await _unitOfWork.Context.Rankings
      .Where(r => r.SeriesId == id)
      .ExecuteDeleteAsync(cancellationToken);

    var chapterIds = await _unitOfWork.Context.Chapters
      .Where(c => c.SeriesId == id)
      .Select(c => c.Id)
      .ToListAsync(cancellationToken);
    if (chapterIds.Count > 0)
    {
      var pageIds = await _unitOfWork.Context.Pages
        .Where(p => chapterIds.Contains(p.ChapterId))
        .Select(p => p.Id)
        .ToListAsync(cancellationToken);
      if (pageIds.Count > 0)
      {
        var taskIds = await _unitOfWork.Context.Tasks
          .Where(t => pageIds.Contains(t.PageId))
          .Select(t => t.Id)
          .ToListAsync(cancellationToken);
        if (taskIds.Count > 0)
        {
          await _unitOfWork.Context.Submissions
            .Where(s => taskIds.Contains(s.TaskId))
            .ExecuteDeleteAsync(cancellationToken);
          await _unitOfWork.Context.Tasks
            .Where(t => taskIds.Contains(t.Id))
            .ExecuteDeleteAsync(cancellationToken);
        }

        await _unitOfWork.Context.Annotations
          .Where(a => pageIds.Contains(a.PageId))
          .ExecuteDeleteAsync(cancellationToken);
        await _unitOfWork.Context.AiSegmentationResults
          .Where(a => a.PageId != null && pageIds.Contains(a.PageId.Value))
          .ExecuteDeleteAsync(cancellationToken);
        await _unitOfWork.Context.Pages
          .Where(p => pageIds.Contains(p.Id))
          .ExecuteDeleteAsync(cancellationToken);
      }

      await _unitOfWork.Context.Chapters
        .Where(c => chapterIds.Contains(c.Id))
        .ExecuteDeleteAsync(cancellationToken);
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

    // Editor báo sẵn sàng XB chỉ một lần. Khi board lên lịch, series có thể bị
    // promote Completed → Publishing; không cho báo lại (kể cả khi còn chương đang review).
    if (newStatus == SeriesStatus.Completed && IsEditor(caller.Role))
    {
      if (series.Status == SeriesStatus.Completed)
      {
        throw new ArgumentException("Series đã được báo sẵn sàng xuất bản.");
      }

      var hasPublishedChapter = await _unitOfWork.Context.Chapters.AsNoTracking().AnyAsync(
        c => c.SeriesId == series.Id
          && c.ChapterNumber > 0
          && c.Status == ChapterStatus.Published,
        cancellationToken);
      if (hasPublishedChapter)
      {
        throw new ArgumentException(
          "Series đã có chương xuất bản — không cần báo sẵn sàng lại khi mangaka gửi chương mới.");
      }
    }

    if (newStatus == SeriesStatus.PendingReview && series.Status != SeriesStatus.PendingReview)
    {
      var oldVotes = await _unitOfWork.Context.BoardVotes
        .Where(v => v.SeriesId == series.Id)
        .ToListAsync(cancellationToken);
      _unitOfWork.Context.BoardVotes.RemoveRange(oldVotes);

      var oldInvitations = await _unitOfWork.Context.SeriesBoardReviewInvitations
        .Where(i => i.SeriesId == series.Id)
        .ToListAsync(cancellationToken);
      _unitOfWork.Context.SeriesBoardReviewInvitations.RemoveRange(oldInvitations);

      var oldClaims = await _unitOfWork.Context.SeriesBoardReviewClaims
        .Where(c => c.SeriesId == series.Id)
        .ToListAsync(cancellationToken);
      _unitOfWork.Context.SeriesBoardReviewClaims.RemoveRange(oldClaims);

      series.SubmittedForReviewAt = DateTime.UtcNow;
    }

    var becamePendingReview = newStatus == SeriesStatus.PendingReview && series.Status != SeriesStatus.PendingReview;
    var becameCompleted = newStatus == SeriesStatus.Completed && series.Status != SeriesStatus.Completed;

    series.Status = newStatus;
    series.UpdatedAt = DateTime.UtcNow;
    SeriesRepository.Update(series);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    if (becamePendingReview)
    {
      await AssignFixedBoardReviewersAndNotifyAsync(series, cancellationToken);
    }

    if (becameCompleted)
    {
      await NotifyLeadOnSeriesCompletedAsync(series, cancellationToken);
    }

    return await GetByIdAsync(callerId, id, cancellationToken);
  }

  /// <summary>
  /// Gán tối đa 3 board: 1 Lead (title Lead ít việc nhất) + 2 board thường ít việc;
  /// thiếu thì bổ sung Lead khác với tư cách reviewer thường.
  /// </summary>
  private async Task AssignFixedBoardReviewersAndNotifyAsync(
    SeriesEntity series,
    CancellationToken cancellationToken)
  {
    var allBoards = await _unitOfWork.Context.Profiles
      .AsNoTracking()
      .Where(p => p.Role == ProfileRole.Board && (p.IsActive == null || p.IsActive == true))
      .ToListAsync(cancellationToken);
    var loads = await _boardService.GetActiveBoardSeriesCountsAsync(cancellationToken);
    var panel = Board.BoardService.SelectFixedBoardPanel(
      allBoards,
      loads,
      SeriesReviewRules.MaxActiveReviewSlots);

    var claimedAt = DateTime.UtcNow;
    foreach (var seat in panel)
    {
      _unitOfWork.Context.SeriesBoardReviewClaims.Add(new SeriesBoardReviewClaim
      {
        SeriesId = series.Id,
        BoardMemberId = seat.Profile.Id,
        Source = "fixed_board",
        ClaimedAt = claimedAt,
        IsLead = seat.IsLead
      });
    }

    await _unitOfWork.SaveChangesAsync(cancellationToken);

    if (panel.Count == 0)
    {
      return;
    }

    var hours = SeriesReviewRules.ReviewExpiryHours;
    var deadline = (series.SubmittedForReviewAt ?? DateTime.UtcNow).AddHours(hours);
    var deadlineLocal = deadline.ToLocalTime().ToString("HH:mm dd/MM/yyyy");
    await _notificationService.CreateForUsersAsync(
      panel.Select(s => s.Profile.Id).ToList(),
      "Có series cần xét duyệt",
      $"Series \"{series.Title}\" đang chờ bạn xét duyệt. Hạn còn {hours} giờ (đến {deadlineLocal}). Mở hồ sơ để bỏ phiếu.",
      WorkflowNotificationPaths.BoardSubmission(series.Id),
      WorkflowNotificationPaths.CategorySubmission,
      cancellationToken);

    var leadSeat = panel.FirstOrDefault(s => s.IsLead);
    if (leadSeat is not null)
    {
      await _notificationService.CreateAsync(
        leadSeat.Profile.Id,
        "Bạn là Board Lead của series này",
        $"Với tư cách Lead hội đồng, bạn phụ trách \"{series.Title}\" (sau khi duyệt sẽ lên lịch xuất bản).",
        WorkflowNotificationPaths.BoardSubmission(series.Id),
        WorkflowNotificationPaths.CategorySubmission,
        cancellationToken: cancellationToken);
    }
  }

  private async Task NotifyLeadOnSeriesCompletedAsync(
    SeriesEntity series,
    CancellationToken cancellationToken)
  {
    var lead = await _unitOfWork.Context.SeriesBoardReviewClaims
      .AsNoTracking()
      .FirstOrDefaultAsync(c => c.SeriesId == series.Id && c.IsLead, cancellationToken);

    if (lead is null)
    {
      return;
    }

    await _notificationService.CreateAsync(
      lead.BoardMemberId,
      "Series sẵn sàng xuất bản",
      $"Editor báo \"{series.Title}\" đã sẵn sàng để lên lịch xuất bản. Vẫn có thể dời lịch XB hoặc làm thêm chương nếu cần.",
      WorkflowNotificationPaths.BoardSchedule(series.Id),
      WorkflowNotificationPaths.CategorySubmission,
      cancellationToken: cancellationToken);
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
      .Where(r => r.Series is not null)
      .GroupBy(r => r.SeriesId)
      .Select(g => g.OrderByDescending(r => r.IssueNumber).First())
      .Select(r => new SeriesRankingItemResponse(
        r.SeriesId,
        r.Series!.Title,
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

  public async Task<EditorStudioProgressResponse?> GetStudioProgressAsync(
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
      throw new SeriesForbiddenException("You do not have permission to view studio progress for this series.");
    }

    if (IsEditor(caller.Role) && series.EditorId != caller.Id)
    {
      throw new SeriesForbiddenException("Only the assigned editor can view studio progress for this series.");
    }

    var chapters = await _unitOfWork.Context.Chapters
      .AsNoTracking()
      .Where(c => c.SeriesId == seriesId && c.ChapterNumber > 0)
      .OrderBy(c => c.ChapterNumber)
      .ToListAsync(cancellationToken);

    // Editor chỉ theo dõi chương đã gửi xét duyệt trở đi (không thấy draft/in_progress khi mangaka còn đang làm).
    if (IsEditor(caller.Role))
    {
      chapters = chapters
        .Where(c => c.Status is ChapterStatus.Reviewing
          or ChapterStatus.Completed
          or ChapterStatus.Published)
        .ToList();
    }

    var chapterIds = chapters.Select(c => c.Id).ToList();
    var pages = chapterIds.Count == 0
      ? []
      : await _unitOfWork.Context.Pages
        .AsNoTracking()
        .Where(p => chapterIds.Contains(p.ChapterId))
        .Select(p => new { p.ChapterId, p.Status })
        .ToListAsync(cancellationToken);

    var pageChapterMap = chapterIds.Count == 0
      ? new Dictionary<Guid, Guid>()
      : await _unitOfWork.Context.Pages
        .AsNoTracking()
        .Where(p => chapterIds.Contains(p.ChapterId))
        .Select(p => new { p.Id, p.ChapterId })
        .ToDictionaryAsync(p => p.Id, p => p.ChapterId, cancellationToken);

    var allPageIds = pageChapterMap.Keys.ToList();
    var tasks = allPageIds.Count == 0
      ? []
      : await _unitOfWork.Context.Tasks
        .AsNoTracking()
        .Where(t => allPageIds.Contains(t.PageId))
        .Select(t => new { t.PageId, t.Status })
        .ToListAsync(cancellationToken);

    var now = DateTime.UtcNow;
    var chapterItems = new List<EditorChapterProgressItem>();
    var totalPages = 0;
    var completedPages = 0;
    var totalTasks = 0;
    var completedTasks = 0;
    var overdueChapters = 0;

    foreach (var chapter in chapters)
    {
      var chapterPages = pages.Where(p => p.ChapterId == chapter.Id).ToList();
      var chapterPageIdSet = pageChapterMap
        .Where(kv => kv.Value == chapter.Id)
        .Select(kv => kv.Key)
        .ToHashSet();

      var chapterTasks = tasks.Where(t => chapterPageIdSet.Contains(t.PageId)).ToList();
      var pageCount = chapterPages.Count;
      var chapterCompletedPages = chapterPages.Count(p =>
        p.Status is PageStatus.Approved or PageStatus.Published);
      var pendingTasks = chapterTasks.Count(t => t.Status == TaskStatuses.Todo);
      var activeTasks = chapterTasks.Count(t =>
        t.Status is TaskStatuses.InProgress or TaskStatuses.Submitted);
      var doneTasks = chapterTasks.Count(t =>
        t.Status is TaskStatuses.Approved or TaskStatuses.Rejected);
      var chapterTotalTasks = chapterTasks.Count;
      var chapterCompletedTasks = chapterTasks.Count(t => t.Status == TaskStatuses.Approved);

      var progressPercent = chapterTotalTasks > 0
        ? (int)Math.Round(chapterCompletedTasks * 100.0 / chapterTotalTasks)
        : chapter.Status is ChapterStatus.Completed or ChapterStatus.Published ? 100 : 0;

      var isOverdue = chapter.Deadline is not null
        && chapter.Deadline < now
        && chapter.Status is not ChapterStatus.Completed and not ChapterStatus.Published;

      if (isOverdue)
      {
        overdueChapters++;
      }

      totalPages += pageCount;
      completedPages += chapterCompletedPages;
      totalTasks += chapterTotalTasks;
      completedTasks += chapterCompletedTasks;

      chapterItems.Add(new EditorChapterProgressItem(
        chapter.Id,
        chapter.ChapterNumber,
        chapter.Title ?? $"Chapter {chapter.ChapterNumber}",
        ChapterStatuses.ToDbValue(chapter.Status),
        chapter.Deadline,
        progressPercent,
        pageCount,
        chapterCompletedPages,
        pendingTasks,
        activeTasks,
        doneTasks,
        isOverdue));
    }

    var overallProgress = totalTasks > 0
      ? (int)Math.Round(completedTasks * 100.0 / totalTasks)
      : totalPages > 0
        ? (int)Math.Round(completedPages * 100.0 / totalPages)
        : 0;

    return new EditorStudioProgressResponse(
      seriesId,
      series.Title,
      SeriesStatuses.ToDbValue(series.Status),
      chapters.Count,
      totalPages,
      completedPages,
      totalTasks,
      completedTasks,
      overdueChapters,
      overallProgress,
      chapterItems);
  }

  public async Task<EditorDefenseNoteResponse?> GetEditorDefenseNoteAsync(
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
      throw new SeriesForbiddenException("You do not have permission to view this defense note.");
    }

    return new EditorDefenseNoteResponse(seriesId, series.EditorDefenseNote, series.EditorDefenseNoteUpdatedAt);
  }

  public async Task<EditorDefenseNoteResponse?> UpdateEditorDefenseNoteAsync(
    Guid callerId,
    Guid seriesId,
    UpdateEditorDefenseNoteRequest request,
    CancellationToken cancellationToken = default)
  {
    var caller = await RequireCallerAsync(callerId, cancellationToken);
    var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken);
    if (series is null)
    {
      return null;
    }

    if (!IsEditor(caller.Role) || series.EditorId != caller.Id)
    {
      throw new SeriesForbiddenException("Only the assigned editor can update the defense note.");
    }

    series.EditorDefenseNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
    series.EditorDefenseNoteUpdatedAt = DateTime.UtcNow;
    series.UpdatedAt = DateTime.UtcNow;
    SeriesRepository.Update(series);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    return new EditorDefenseNoteResponse(seriesId, series.EditorDefenseNote, series.EditorDefenseNoteUpdatedAt);
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
    else if (!CanViewerSeeChapter(caller, chapter.Series, chapter.Status, chapter.ChapterNumber))
    {
      throw new SeriesForbiddenException("Chương này chưa nằm trong phạm vi xem của bạn.");
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

    EnsureMangakaCanEditChapterContent(caller, chapter);

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

    // Chapter 0 = bản thảo đề xuất — cho phép thay file bất kỳ lúc nào.
    // Chương sản xuất vẫn khóa theo trạng thái workflow.
    if (chapter.ChapterNumber != 0)
    {
      EnsureMangakaCanEditChapterContent(caller, chapter);
    }

    var extension = Path.GetExtension(file.FileName);
    if (string.IsNullOrWhiteSpace(extension))
    {
      extension = ".bin";
    }

    var originalName = Path.GetFileName(file.FileName);
    if (string.IsNullOrWhiteSpace(originalName))
    {
      originalName = $"manuscript{extension.ToLowerInvariant()}";
    }
    else if (originalName.Length > 255)
    {
      originalName = originalName[^255..];
    }

    var objectPath = $"chapters/{chapterId}/manuscript{extension.ToLowerInvariant()}";
    chapter.ManuscriptUrl = await _storage.UploadAsync(
      _supabaseOptions.ManuscriptsBucket,
      objectPath,
      file,
      cancellationToken);
    chapter.ManuscriptFileName = originalName;
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

    var isMangakaAuthor = IsMangaka(caller.Role) && chapter.Series.AuthorId == callerId && !IsAdmin(caller.Role);
    var isWithdrawFromReview = isMangakaAuthor
      && chapter.Status == ChapterStatus.Reviewing
      && newStatus is ChapterStatus.Draft or ChapterStatus.InProgress
      && chapter.ReviewAcceptedAt is null;

    // Mangaka không tự mở khóa chương đã duyệt/XB — thu hồi chỉ khi Editor chưa nhận.
    if (isMangakaAuthor
        && chapter.Status is ChapterStatus.Reviewing or ChapterStatus.Completed or ChapterStatus.Published
        && !isWithdrawFromReview)
    {
      if (chapter.Status == ChapterStatus.Reviewing && chapter.ReviewAcceptedAt is not null)
      {
        throw new SeriesForbiddenException(
          "Editor đã nhận xét duyệt chương này — không thể thu hồi. Chờ Editor yêu cầu chỉnh sửa.");
      }

      throw new SeriesForbiddenException(
        "Chương đang khóa. Chỉ Editor hoặc Board có thể yêu cầu chỉnh sửa lại, hoặc thu hồi khi Editor chưa nhận.");
    }

    // Editor duyệt / yêu cầu sửa chỉ sau khi đã nhận xét duyệt.
    var isEditorActing = IsEditor(caller.Role) || IsBoard(caller.Role) || IsAdmin(caller.Role);
    if (isEditorActing
        && chapter.Status == ChapterStatus.Reviewing
        && newStatus is ChapterStatus.Completed or ChapterStatus.InProgress
        && chapter.ReviewAcceptedAt is null
        && !IsAdmin(caller.Role))
    {
      throw new SeriesForbiddenException("Hãy nhận xét duyệt chương trước khi duyệt hoặc yêu cầu sửa.");
    }

    chapter.Status = newStatus;
    chapter.UpdatedAt = DateTime.UtcNow;

    // Gửi xét duyệt lại → reset nhận duyệt.
    if (newStatus == ChapterStatus.Reviewing)
    {
      chapter.ReviewAcceptedAt = null;
      chapter.ReviewAcceptedBy = null;
    }

    // Thu hồi hoặc Editor trả về sửa → clear nhận duyệt.
    if (newStatus is ChapterStatus.Draft or ChapterStatus.InProgress)
    {
      chapter.ReviewAcceptedAt = null;
      chapter.ReviewAcceptedBy = null;
    }

    ChapterRepository.Update(chapter);
    await SyncPagesWithChapterStatusAsync(chapter.Id, newStatus, cancellationToken);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    if (isWithdrawFromReview && chapter.Series.EditorId is Guid editorId)
    {
      var chapterLabel = $"Ch.{chapter.ChapterNumber}"
        + (string.IsNullOrWhiteSpace(chapter.Title) ? "" : $" «{chapter.Title}»");
      await _notificationService.CreateAsync(
        editorId,
        "Mangaka thu hồi xét duyệt chương",
        $"{caller.FullName} đã thu hồi «{chapter.Series.Title}» — {chapterLabel} để chỉnh sửa thêm.",
        WorkflowNotificationPaths.EditorSeries(chapter.SeriesId),
        WorkflowNotificationPaths.CategorySubmission,
        cancellationToken: cancellationToken);
    }

    return MapChapterToDto(chapter);
  }

  public async Task<ChapterResponse?> AcceptChapterReviewAsync(
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
      return null;
    }

    if (!IsAdmin(caller.Role)
        && !(IsEditor(caller.Role) && (chapter.Series.EditorId == caller.Id || chapter.Series.EditorId is null))
        && !IsBoard(caller.Role))
    {
      throw new SeriesForbiddenException("Only the assigned editor, board, or admin can accept chapter review.");
    }

    if (chapter.Status != ChapterStatus.Reviewing)
    {
      throw new SeriesForbiddenException("Chỉ nhận xét duyệt khi chương đang chờ Editor.");
    }

    if (chapter.ReviewAcceptedAt is not null)
    {
      return MapChapterToDto(chapter);
    }

    chapter.ReviewAcceptedAt = DateTime.UtcNow;
    chapter.ReviewAcceptedBy = caller.Id;
    chapter.UpdatedAt = DateTime.UtcNow;
    ChapterRepository.Update(chapter);
    await _unitOfWork.SaveChangesAsync(cancellationToken);

    var chapterLabel = $"Ch.{chapter.ChapterNumber}"
      + (string.IsNullOrWhiteSpace(chapter.Title) ? "" : $" «{chapter.Title}»");
    await _notificationService.CreateAsync(
      chapter.Series.AuthorId,
      "Editor đã nhận xét duyệt chương",
      $"{caller.FullName} đã nhận xét duyệt «{chapter.Series.Title}» — {chapterLabel}. Bạn không thể thu hồi cho đến khi Editor yêu cầu sửa.",
      WorkflowNotificationPaths.MangakaSeries(chapter.SeriesId),
      WorkflowNotificationPaths.CategorySubmission,
      cancellationToken: cancellationToken);

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

    await PromoteScheduledChaptersToPublishedAsync(seriesId, cancellationToken);

    var chapters = await _unitOfWork.Context.Chapters
      .AsNoTracking()
      .Where(c => c.SeriesId == seriesId)
      .OrderBy(c => c.ChapterNumber)
      .ToListAsync(cancellationToken);

    return chapters
      .Where(c => CanViewerSeeChapter(caller, series, c.Status, c.ChapterNumber))
      .Select(MapChapterToDto)
      .ToList();
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
    // Ưu tiên hạn do mangaka/editor nhập. Weekly chỉ gợi ý +7 khi không gửi deadline.
    var deadline = request.Deadline;
    if (deadline is null && series.PublishingFrequency == PublishingFrequency.Weekly && request.ChapterNumber > 0)
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
    // Không đổi series → publishing chỉ vì tạo chương nháp; chỉ chuyển khi có chương Published.
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

  /// <summary>
  /// Đồng bộ nhãn series với thực tế xuất bản:
  /// có chương Published → publishing; đang publishing nhưng chưa có chương Published → approved.
  /// </summary>
  private async Task PromoteScheduledSeriesToPublishingAsync(
    CancellationToken cancellationToken,
    Guid? seriesId = null)
  {
    var candidates = _unitOfWork.Context.Series
      .Where(s =>
        s.Status == SeriesStatus.Approved
        || s.Status == SeriesStatus.Completed
        || s.Status == SeriesStatus.Publishing);

    if (seriesId is Guid id)
    {
      candidates = candidates.Where(s => s.Id == id);
    }

    var list = await candidates.ToListAsync(cancellationToken);
    if (list.Count == 0)
    {
      return;
    }

    var seriesIds = list.Select(s => s.Id).ToList();
    var publishedSeriesIds = (await _unitOfWork.Context.Chapters
        .AsNoTracking()
        .Where(c => seriesIds.Contains(c.SeriesId) && c.Status == ChapterStatus.Published)
        .Select(c => c.SeriesId)
        .Distinct()
        .ToListAsync(cancellationToken))
      .ToHashSet();

    var now = DateTime.UtcNow;
    var changed = false;
    foreach (var series in list)
    {
      var hasPublished = publishedSeriesIds.Contains(series.Id);
      if (hasPublished && series.Status is SeriesStatus.Approved or SeriesStatus.Completed)
      {
        series.Status = SeriesStatus.Publishing;
        series.UpdatedAt = now;
        changed = true;
      }
      else if (!hasPublished && series.Status == SeriesStatus.Publishing)
      {
        series.Status = SeriesStatus.Approved;
        series.UpdatedAt = now;
        changed = true;
      }
    }

    if (changed)
    {
      await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
  }

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
      s.UpdatedAt,
      s.SubmittedForReviewAt,
      s.EditorDefenseNote,
      s.EditorDefenseNoteUpdatedAt);

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
      c.UpdatedAt,
      c.ReviewAcceptedAt,
      c.ReviewAcceptedBy,
      c.ManuscriptFileName);

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
      s.UpdatedAt,
      s.SubmittedForReviewAt);

  private static bool CanViewerSeeChapter(
    Profile caller,
    SeriesEntity series,
    ChapterStatus status,
    int chapterNumber)
  {
    if (IsAdmin(caller.Role))
    {
      return true;
    }

    if (IsMangaka(caller.Role) && series.AuthorId == caller.Id)
    {
      return true;
    }

    // Bản thảo đề xuất (chương 0) — board cần xem khi xét duyệt series.
    if (IsBoard(caller.Role) && chapterNumber == 0)
    {
      return true;
    }

    // Board chỉ thấy chương Editor đã duyệt (hoặc đã XB).
    if (IsBoard(caller.Role))
    {
      return status is ChapterStatus.Completed or ChapterStatus.Published;
    }

    // Editor: chỉ thấy sau khi mangaka bấm gửi xét duyệt; sau yêu cầu sửa (in_progress) ẩn đến khi gửi lại.
    if (IsEditor(caller.Role))
    {
      if (series.EditorId != caller.Id)
      {
        return false;
      }

      return status is ChapterStatus.Reviewing
        or ChapterStatus.Completed
        or ChapterStatus.Published;
    }

    return true;
  }

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

  /// <summary>
  /// Mangaka chỉ sửa nội dung khi chương còn Draft / InProgress (sau khi Editor yêu cầu sửa).
  /// </summary>
  private static void EnsureMangakaCanEditChapterContent(Profile caller, Chapter chapter)
  {
    if (!IsMangaka(caller.Role) || IsAdmin(caller.Role))
    {
      return;
    }

    if (chapter.Status is ChapterStatus.Draft or ChapterStatus.InProgress)
    {
      return;
    }

    throw new SeriesForbiddenException(
      "Chương đã duyệt / đang xét duyệt / đã xuất bản bị khóa. Chỉ mở lại khi Editor hoặc Board yêu cầu chỉnh sửa.");
  }

  /// <summary>
  /// Chương đã gắn lịch XB và ngày XB đã tới nhưng còn completed → chuyển published.
  /// </summary>
  private async Task PromoteScheduledChaptersToPublishedAsync(
    Guid seriesId,
    CancellationToken cancellationToken)
  {
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var toPromote = await _unitOfWork.Context.Chapters
      .Where(c =>
        c.SeriesId == seriesId
        && c.Status == ChapterStatus.Completed
        && _unitOfWork.Context.PublishingSchedules.Any(ps =>
          ps.ChapterId == c.Id && ps.PublishDate <= today))
      .ToListAsync(cancellationToken);

    if (toPromote.Count == 0)
    {
      return;
    }

    var now = DateTime.UtcNow;
    foreach (var chapter in toPromote)
    {
      chapter.Status = ChapterStatus.Published;
      chapter.UpdatedAt = now;
      await SyncPagesWithChapterStatusAsync(chapter.Id, ChapterStatus.Published, cancellationToken);
    }

    var series = await SeriesRepository.GetByIdAsync(seriesId, asNoTracking: false, cancellationToken);
    if (series is not null
        && series.Status is SeriesStatus.Approved or SeriesStatus.Completed)
    {
      series.Status = SeriesStatus.Publishing;
      series.UpdatedAt = now;
      SeriesRepository.Update(series);
    }

    await _unitOfWork.SaveChangesAsync(cancellationToken);
  }

  /// <summary>
  /// Đồng bộ status trang theo chương: duyệt → approved, xuất bản → published.
  /// </summary>
  private async Task SyncPagesWithChapterStatusAsync(
    Guid chapterId,
    ChapterStatus chapterStatus,
    CancellationToken cancellationToken)
  {
    PageStatus? target = chapterStatus switch
    {
      ChapterStatus.Published => PageStatus.Published,
      ChapterStatus.Completed => PageStatus.Approved,
      ChapterStatus.Reviewing => PageStatus.Reviewing,
      // Thu hồi xét duyệt → trang đang reviewing về draft để mangaka sửa tiếp.
      ChapterStatus.Draft or ChapterStatus.InProgress => PageStatus.Draft,
      _ => null
    };

    if (target is null)
    {
      return;
    }

    IQueryable<Page> query = _unitOfWork.Context.Pages.Where(p => p.ChapterId == chapterId);
    if (target == PageStatus.Draft)
    {
      // Chỉ hạ trang đang xét duyệt, không đụng trang đã duyệt/XB.
      query = query.Where(p => p.Status == PageStatus.Reviewing);
    }
    else
    {
      query = query.Where(p => p.Status != target.Value);
    }

    var pages = await query.ToListAsync(cancellationToken);

    if (pages.Count == 0)
    {
      return;
    }

    var now = DateTime.UtcNow;
    foreach (var page in pages)
    {
      // Không hạ cấp trang đã published khi chương chỉ ở completed.
      if (target == PageStatus.Approved && page.Status == PageStatus.Published)
      {
        continue;
      }

      page.Status = target.Value;
      page.UpdatedAt = now;
    }
  }

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

  private IQueryable<SeriesBoardReviewInvitation> BoardInvitationQuery(bool asNoTracking = true)
  {
    var query = _unitOfWork.Context.SeriesBoardReviewInvitations
      .Include(i => i.Series)
      .ThenInclude(s => s.Author)
      .Include(i => i.BoardMember)
      .AsQueryable();

    return asNoTracking ? query.AsNoTracking() : query;
  }

  private static SeriesBoardReviewInvitationResponse MapBoardInvitation(SeriesBoardReviewInvitation invitation) =>
    new(
      invitation.SeriesId,
      invitation.Series.Title,
      invitation.Series.AuthorId,
      invitation.Series.Author.FullName,
      invitation.BoardMemberId,
      invitation.BoardMember.FullName,
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
