using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.ActivityLogs;

public record ActivityLogResponse(
    Guid Id,
    Guid? UserId,
    string? UserName,
    string? Action,
    string? EntityType,
    Guid? EntityId,
    string? OldData,
    string? NewData,
    DateTime? CreatedAt);

public record ActivityLogListResponse(
    IReadOnlyList<ActivityLogResponse> Data,
    int Total,
    int Page,
    int Limit);

public record ActivityCountByActionResponse(string Action, int Count);

public record ActivityLogStatsResponse(
    int TotalLogs,
    int Last24Hours,
    int Last7Days,
    IReadOnlyList<ActivityCountByActionResponse> ByAction);

public record CreateActivityLogRequest(
    [Required, MaxLength(100)] string Action,
    [Required, MaxLength(100)] string EntityType,
    Guid? EntityId,
    string? OldData,
    string? NewData);
