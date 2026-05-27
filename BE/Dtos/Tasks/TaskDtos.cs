using System.ComponentModel.DataAnnotations;

namespace PRN232v1.Dtos.Tasks;

public record TaskItemResponse(
    Guid Id,
    Guid PageId,
    string TaskType,
    string Status,
    string? Title,
    string? Description,
    string Region,
    Guid? AssignedTo,
    string? AssignedToName,
    Guid? AssignedBy,
    int? Priority,
    DateTime? Deadline,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime? CreatedAt);

public record KanbanColumnItemResponse(
    Guid Id,
    string TaskType,
    string Status,
    Guid PageId,
    string? Title,
    Guid? AssignedTo);

public record KanbanResponse(
    IReadOnlyList<KanbanColumnItemResponse> Todo,
    IReadOnlyList<KanbanColumnItemResponse> Doing,
    IReadOnlyList<KanbanColumnItemResponse> Done);

public record CreateTaskRequest(
    [Required] string TaskType,
    [Required] string Region,
    [MaxLength(255)] string? Title,
    string? Description,
    Guid? AssignedTo,
    int? Priority,
    DateTime? Deadline);

public record UpdateTaskRequest(
    [MaxLength(255)] string? Title,
    string? Description,
    string? Region,
    Guid? AssignedTo,
    int? Priority,
    DateTime? Deadline);

public record UpdateTaskStatusRequest(
    [Required, MaxLength(30)] string Status);
