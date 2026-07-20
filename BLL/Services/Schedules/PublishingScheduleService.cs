using Microsoft.EntityFrameworkCore;
using DAL.Common;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Dtos.Schedules;
using BLL.Services.Notifications;
using BLL.Common;

namespace BLL.Services.Schedules;

public class PublishingScheduleService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly NotificationService _notificationService;
    private Repository<PublishingSchedule> Repository => _unitOfWork.Repository<PublishingSchedule>();

    public PublishingScheduleService(UnitOfWork unitOfWork, NotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<PublishingScheduleResponse>> ListBySeriesAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        _ = await RequireSeriesAccessAsync(callerId, seriesId, cancellationToken);
        await SyncIssueNumbersAsync(seriesId, cancellationToken);

        var items = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Include(s => s.Chapter)
            .Where(s => s.SeriesId == seriesId)
            .OrderBy(s => s.PublishDate)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    /// <summary>
    /// Đồng bộ số kỳ theo ngày XB (migrate dữ liệu cũ gắn kỳ = số chương).
    /// </summary>
    public async Task SyncIssueNumbersAsync(
        Guid? seriesId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _unitOfWork.Context.PublishingSchedules.AsQueryable();
        if (seriesId is Guid sid)
        {
            query = query.Where(s => s.SeriesId == sid);
        }

        var items = await query.ToListAsync(cancellationToken);
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

    public async Task<IReadOnlyList<ScheduleChapterOptionResponse>> ListChapterOptionsAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        await RequireScheduleManagerAsync(callerId, seriesId, cancellationToken);

        var scheduledChapterIds = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Where(s => s.SeriesId == seriesId && s.ChapterId != null)
            .Select(s => s.ChapterId!.Value)
            .ToListAsync(cancellationToken);

        var chapters = await _unitOfWork.Context.Chapters
            .AsNoTracking()
            .Where(c => c.SeriesId == seriesId && c.ChapterNumber > 0)
            .OrderBy(c => c.ChapterNumber)
            .ToListAsync(cancellationToken);

        return chapters.Select(c => new ScheduleChapterOptionResponse(
            c.Id,
            c.ChapterNumber,
            c.Title,
            ChapterStatuses.ToDbValue(c.Status),
            scheduledChapterIds.Contains(c.Id))).ToList();
    }

    public async Task<PublishingScheduleResponse> CreateAsync(
        Guid callerId,
        Guid seriesId,
        CreatePublishingScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PublishingFrequencies.IsValid(request.Frequency))
        {
            throw new ArgumentException($"Invalid frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
        }

        EnsurePublishDateNotInPast(request.PublishDate);

        var series = await RequireScheduleManagerAsync(callerId, seriesId, cancellationToken);
        try
        {
            SeriesWorkflowRules.EnsureAllowsPublishingSchedule(series.Status);
        }
        catch (InvalidOperationException ex)
        {
            throw new WorkflowForbiddenException(ex.Message);
        }

        Chapter? chapter = null;
        if (request.ChapterId is Guid chapterId)
        {
            chapter = await RequireChapterForSeriesAsync(seriesId, chapterId, excludeScheduleId: null, cancellationToken);
        }

        var frequency = PublishingFrequencies.ParseOrDefault(request.Frequency);
        // Kỳ = đợt XB theo ngày (tuần/tháng), không theo số chương.
        var issueNumber = PublishingIssueNumbers.FromPublishDate(request.PublishDate, frequency);

        var schedule = new PublishingSchedule
        {
            Id = Guid.NewGuid(),
            SeriesId = seriesId,
            ChapterId = chapter?.Id,
            PublishDate = request.PublishDate,
            Frequency = frequency,
            IssueNumber = issueNumber,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(schedule, cancellationToken);

        // Chỉ Published khi ngày XB đã tới; ngày tương lai giữ Completed (đã lên lịch).
        // Series → publishing chỉ khi có chương thực sự Published (không chỉ vì có lịch).
        if (chapter is not null)
        {
            await ApplyChapterPublishStateAsync(chapter, request.PublishDate, cancellationToken);
            await SyncSeriesPublishingStatusAsync(series, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var chapterLabel = chapter is null
            ? ""
            : $" · Ch.{chapter.ChapterNumber}{(string.IsNullOrWhiteSpace(chapter.Title) ? "" : $" «{chapter.Title}»")}";
        var dateLabel = request.PublishDate.ToString("dd/MM/yyyy");
        var issueLabel = PublishingIssueNumbers.FormatLabel(issueNumber);
        var scheduleMessage =
            $"Lịch xuất bản mới cho \"{series.Title}\" — ngày {dateLabel} ({issueLabel}){chapterLabel}.";

        await _notificationService.CreateAsync(
            series.AuthorId,
            "Lịch xuất bản mới",
            scheduleMessage,
            WorkflowNotificationPaths.MangakaSeries(seriesId),
            WorkflowNotificationPaths.CategorySubmission,
            cancellationToken: cancellationToken);

        if (series.EditorId is Guid editorId)
        {
            await _notificationService.CreateAsync(
                editorId,
                "Lịch xuất bản mới",
                scheduleMessage,
                WorkflowNotificationPaths.EditorSeries(seriesId),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }

        schedule.Chapter = chapter;
        return Map(schedule);
    }

    public async Task<PublishingScheduleResponse?> UpdateAsync(
        Guid callerId,
        Guid scheduleId,
        UpdatePublishingScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Frequency is not null && !PublishingFrequencies.IsValid(request.Frequency))
        {
            throw new ArgumentException($"Invalid frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
        }

        var schedule = await _unitOfWork.Context.PublishingSchedules
            .Include(s => s.Chapter)
            .FirstOrDefaultAsync(s => s.Id == scheduleId, cancellationToken);
        if (schedule is null || schedule.SeriesId is null)
        {
            return null;
        }

        var series = await RequireScheduleManagerAsync(callerId, schedule.SeriesId.Value, cancellationToken);
        var oldDate = schedule.PublishDate;
        var dateChanged = false;

        if (request.PublishDate is not null)
        {
            EnsurePublishDateNotInPast(request.PublishDate.Value);
            dateChanged = request.PublishDate.Value != oldDate;
            schedule.PublishDate = request.PublishDate.Value;
        }

        if (request.Frequency is not null)
        {
            schedule.Frequency = PublishingFrequencies.ParseOrDefault(request.Frequency);
        }

        // Không nhận IssueNumber tay — luôn suy từ ngày XB + tần suất (chuẩn tạp chí).
        if (request.ClearChapter)
        {
            if (schedule.Chapter is { Status: ChapterStatus.Published } previous)
            {
                previous.Status = ChapterStatus.Completed;
                previous.UpdatedAt = DateTime.UtcNow;
            }

            schedule.ChapterId = null;
            schedule.Chapter = null;
        }
        else if (request.ChapterId is Guid chapterId)
        {
            if (schedule.Chapter is { Status: ChapterStatus.Published } previous
                && previous.Id != chapterId)
            {
                previous.Status = ChapterStatus.Completed;
                previous.UpdatedAt = DateTime.UtcNow;
            }

            var chapter = await RequireChapterForSeriesAsync(
                schedule.SeriesId.Value,
                chapterId,
                excludeScheduleId: schedule.Id,
                cancellationToken);
            schedule.ChapterId = chapter.Id;
            schedule.Chapter = chapter;
        }

        if (request.Notes is not null)
        {
            schedule.Notes = request.Notes;
        }

        schedule.IssueNumber = PublishingIssueNumbers.FromPublishDate(schedule.PublishDate, schedule.Frequency);

        if (schedule.Chapter is not null)
        {
            await ApplyChapterPublishStateAsync(schedule.Chapter, schedule.PublishDate, cancellationToken);
        }

        Repository.Update(schedule);
        await SyncSeriesPublishingStatusAsync(series, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (dateChanged)
        {
            var newLabel = schedule.PublishDate.ToString("dd/MM/yyyy");
            var oldLabel = oldDate.ToString("dd/MM/yyyy");
            var note = string.IsNullOrWhiteSpace(schedule.Notes) ? "" : $" Lý do/ghi chú: {schedule.Notes}";
            var message =
                $"Lịch XB \"{series.Title}\" ({PublishingIssueNumbers.FormatLabel(schedule.IssueNumber)}) đã dời từ {oldLabel} sang {newLabel}.{note}";

            await _notificationService.CreateAsync(
                series.AuthorId,
                "Đã dời lịch xuất bản",
                message,
                WorkflowNotificationPaths.MangakaSeries(series.Id),
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);

            if (series.EditorId is Guid editorId)
            {
                await _notificationService.CreateAsync(
                    editorId,
                    "Đã dời lịch xuất bản",
                    message,
                    WorkflowNotificationPaths.EditorSeries(series.Id),
                    WorkflowNotificationPaths.CategorySubmission,
                    cancellationToken: cancellationToken);
            }
        }

        return Map(schedule);
    }

    public async Task<bool> DeleteAsync(Guid callerId, Guid scheduleId, CancellationToken cancellationToken = default)
    {
        var schedule = await _unitOfWork.Context.PublishingSchedules
            .Include(s => s.Chapter)
            .FirstOrDefaultAsync(s => s.Id == scheduleId, cancellationToken);
        if (schedule is null || schedule.SeriesId is null)
        {
            return false;
        }

        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        if (!PageAccessService.IsAdmin(caller.Role))
        {
            await RequireScheduleManagerAsync(callerId, schedule.SeriesId.Value, cancellationToken);
        }

        if (schedule.Chapter is { Status: ChapterStatus.Published } chapter)
        {
            chapter.Status = ChapterStatus.Completed;
            chapter.UpdatedAt = DateTime.UtcNow;
        }

        Repository.Remove(schedule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<Chapter> RequireChapterForSeriesAsync(
        Guid seriesId,
        Guid chapterId,
        Guid? excludeScheduleId,
        CancellationToken cancellationToken)
    {
        var chapter = await _unitOfWork.Context.Chapters
            .FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken)
            ?? throw new ArgumentException("Chapter not found.");

        if (chapter.SeriesId != seriesId)
        {
            throw new ArgumentException("Chapter does not belong to this series.");
        }

        if (chapter.ChapterNumber <= 0)
        {
            throw new ArgumentException("Chỉ được gắn chương sản xuất (số chương > 0).");
        }

        var alreadyUsed = await _unitOfWork.Context.PublishingSchedules
            .AnyAsync(
                s => s.ChapterId == chapterId
                    && s.SeriesId == seriesId
                    && (excludeScheduleId == null || s.Id != excludeScheduleId),
                cancellationToken);
        if (alreadyUsed)
        {
            throw new ArgumentException($"Chương {chapter.ChapterNumber} đã được gắn vào lịch khác.");
        }

        return chapter;
    }

    private async Task MarkChapterPagesAsync(
        Guid chapterId,
        PageStatus status,
        CancellationToken cancellationToken)
    {
        var pages = await _unitOfWork.Context.Pages
            .Where(p => p.ChapterId == chapterId && p.Status != status)
            .ToListAsync(cancellationToken);
        if (pages.Count == 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        foreach (var page in pages)
        {
            page.Status = status;
            page.UpdatedAt = now;
        }
    }

    private async Task<DAL.Models.Series> RequireSeriesAccessAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Series not found.");

        if (PageAccessService.IsAdmin(caller.Role)
            || PageAccessService.IsBoard(caller.Role)
            || series.AuthorId == caller.Id
            || (PageAccessService.IsEditor(caller.Role) && series.EditorId == caller.Id))
        {
            return series;
        }

        throw new WorkflowForbiddenException("You do not have permission to view schedules for this series.");
    }

    private async Task<DAL.Models.Series> RequireScheduleManagerAsync(Guid callerId, Guid seriesId, CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Series not found.");

        if (PageAccessService.IsAdmin(caller.Role))
        {
            return series;
        }

        if (PageAccessService.IsBoard(caller.Role))
        {
            var isLead = await _unitOfWork.Context.SeriesBoardReviewClaims
                .AnyAsync(c => c.SeriesId == seriesId && c.BoardMemberId == callerId && c.IsLead, cancellationToken);
            if (!isLead)
            {
                throw new WorkflowForbiddenException("Chỉ board phụ trách chính mới được sắp lịch xuất bản.");
            }

            return series;
        }

        throw new WorkflowForbiddenException("Requires board lead or admin.");
    }

    private static void EnsurePublishDateNotInPast(DateOnly publishDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (publishDate < today)
        {
            throw new ArgumentException("Không thể chọn ngày phát hành trong quá khứ.");
        }
    }

    /// <summary>
    /// Series chỉ là <c>publishing</c> khi đã có ít nhất một chương <c>Published</c>.
    /// Có lịch XB nhưng chưa tới ngày / chương còn nháp → giữ approved hoặc completed.
    /// </summary>
    private async Task SyncSeriesPublishingStatusAsync(
        DAL.Models.Series series,
        CancellationToken cancellationToken)
    {
        if (series.Status is SeriesStatus.Draft
            or SeriesStatus.PendingReview
            or SeriesStatus.Cancelled
            or SeriesStatus.Hiatus)
        {
            return;
        }

        var hasPublishedChapter = await _unitOfWork.Context.Chapters
            .AsNoTracking()
            .AnyAsync(
                c => c.SeriesId == series.Id && c.Status == ChapterStatus.Published,
                cancellationToken);

        if (hasPublishedChapter)
        {
            if (series.Status is SeriesStatus.Approved or SeriesStatus.Completed)
            {
                series.Status = SeriesStatus.Publishing;
                series.UpdatedAt = DateTime.UtcNow;
            }

            return;
        }

        // Đã gắn nhãn publishing sớm (tạo chương / tạo lịch) nhưng chưa XB thật → trả về đúng giai đoạn.
        if (series.Status == SeriesStatus.Publishing)
        {
            series.Status = SeriesStatus.Approved;
            series.UpdatedAt = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Ngày XB đã tới → Published; còn tương lai → giữ/đưa về Completed (đã lên lịch, chưa XB).
    /// </summary>
    private async Task ApplyChapterPublishStateAsync(
        Chapter chapter,
        DateOnly publishDate,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var due = publishDate <= today;

        if (due)
        {
            if (chapter.Status is ChapterStatus.Completed
                or ChapterStatus.Reviewing
                or ChapterStatus.InProgress
                or ChapterStatus.Published)
            {
                if (chapter.Status != ChapterStatus.Published)
                {
                    chapter.Status = ChapterStatus.Published;
                    chapter.UpdatedAt = DateTime.UtcNow;
                }

                await MarkChapterPagesAsync(chapter.Id, PageStatus.Published, cancellationToken);
            }

            return;
        }

        // Ngày XB tương lai: không Published sớm.
        if (chapter.Status is ChapterStatus.Published
            or ChapterStatus.Reviewing
            or ChapterStatus.InProgress
            or ChapterStatus.Completed)
        {
            if (chapter.Status != ChapterStatus.Completed)
            {
                chapter.Status = ChapterStatus.Completed;
                chapter.UpdatedAt = DateTime.UtcNow;
            }

            await MarkChapterPagesAsync(chapter.Id, PageStatus.Approved, cancellationToken);
        }
    }

    private static PublishingScheduleResponse Map(PublishingSchedule s) =>
        new(
            s.Id,
            s.SeriesId,
            s.ChapterId,
            s.Chapter?.ChapterNumber,
            s.Chapter?.Title,
            s.PublishDate,
            PublishingFrequencies.ToDbValue(s.Frequency),
            s.IssueNumber,
            s.Notes,
            s.CreatedAt);
}
