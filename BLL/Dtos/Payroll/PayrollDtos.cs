using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Payroll;

public record AssistantPayrollSummaryItem(
    Guid AssistantId,
    string AssistantName,
    string AssistantEmail,
    int UnpaidTaskCount,
    decimal UnpaidAmount,
    int PaidTaskCount,
    decimal PaidAmount,
    string? PayoutBankName = null,
    string? PayoutBankAccountNumber = null,
    string? PayoutBankAccountHolder = null);

public record UnpaidPayrollTaskItem(
    Guid TaskId,
    string Title,
    decimal Price,
    DateTime? CompletedAt,
    string? SeriesTitle,
    string? PaymentReference = null,
    DateTime? PaidAt = null);

public record AssistantPayrollDetailResponse(
    Guid AssistantId,
    string AssistantName,
    string AssistantEmail,
    int UnpaidTaskCount,
    decimal UnpaidAmount,
    IReadOnlyList<UnpaidPayrollTaskItem> UnpaidTasks,
    string? PayoutBankName = null,
    string? PayoutBankAccountNumber = null,
    string? PayoutBankAccountHolder = null);

public record MarkAssistantPayrollPaidRequest(
    [Required] Guid AssistantId,
    int? Year = null,
    int? Month = null,
    IReadOnlyList<Guid>? TaskIds = null,
    [MaxLength(100)] string? PaymentReference = null);

public record MarkAssistantPayrollPaidResponse(
    Guid AssistantId,
    int TasksMarked,
    decimal TotalAmount,
    string? PaymentReference);
