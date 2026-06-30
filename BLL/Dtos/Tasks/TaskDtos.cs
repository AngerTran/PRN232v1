using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Tasks;

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
    DateTime? CreatedAt,
    IReadOnlyList<string>? ResourceUrls = null,
    string? AssignedByName = null,
    decimal Price = 0,
    string PaymentStatus = "unpaid",
    string? LatestSubmissionFileUrl = null,
    string? LatestSubmissionPreviewUrl = null,
    string? AssistantSubmissionNote = null,
    string? ReviewNote = null,
    DateTime? ReviewedAt = null,
    DateTime? LatestSubmittedAt = null);

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
    DateTime? Deadline,
    [Range(0, 999999999)] decimal? Price = null);

public record UpdateTaskRequest(
    [MaxLength(255)] string? Title,
    string? Description,
    string? Region,
    Guid? AssignedTo,
    int? Priority,
    DateTime? Deadline,
    [Range(0, 999999999)] decimal? Price = null);

public record UpdateTaskStatusRequest(
    [Required, MaxLength(30)] string Status);

public record CreateTaskPaymentRequest(
    string? ReturnUrl = null);

public record CreateTaskPaymentResponse(
    Guid TaskId,
    string PaymentUrl,
    string TxnRef,
    string PaymentStatus);

public record TaskPaymentReturnResponse(
    Guid? TaskId,
    bool IsSuccess,
    string Message,
    string? PaymentStatus,
    string? ResponseCode,
    string? TransactionNo,
    string? TxnRef);
