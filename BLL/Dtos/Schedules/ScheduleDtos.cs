using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Schedules;

public record PublishingScheduleResponse(
    Guid Id,
    Guid? SeriesId,
    DateOnly PublishDate,
    string Frequency,
    int? IssueNumber,
    string? Notes,
    DateTime? CreatedAt);

public record CreatePublishingScheduleRequest(
    [Required] DateOnly PublishDate,
    [Required, MaxLength(20)] string Frequency,
    int? IssueNumber,
    string? Notes);

public record UpdatePublishingScheduleRequest(
    DateOnly? PublishDate,
    [MaxLength(20)] string? Frequency,
    int? IssueNumber,
    string? Notes);
