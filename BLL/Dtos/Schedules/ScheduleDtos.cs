using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Schedules;

public record PublishingScheduleResponse(
    Guid Id,
    Guid? SeriesId,
    Guid? ChapterId,
    int? ChapterNumber,
    string? ChapterTitle,
    DateOnly PublishDate,
    string Frequency,
    int? IssueNumber,
    string? Notes,
    DateTime? CreatedAt);

public record ScheduleChapterOptionResponse(
    Guid ChapterId,
    int ChapterNumber,
    string? Title,
    string Status,
    bool AlreadyScheduled);

public record CreatePublishingScheduleRequest(
    [Required] DateOnly PublishDate,
    [Required, MaxLength(20)] string Frequency,
    int? IssueNumber,
    Guid? ChapterId,
    string? Notes);

public record UpdatePublishingScheduleRequest(
    DateOnly? PublishDate,
    [MaxLength(20)] string? Frequency,
    int? IssueNumber,
    Guid? ChapterId,
    bool ClearChapter = false,
    string? Notes = null);
