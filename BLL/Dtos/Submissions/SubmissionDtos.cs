using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Submissions;

public record SubmissionResponse(
    Guid Id,
    Guid TaskId,
    Guid? AssistantId,
    string? AssistantName,
    int VersionNumber,
    string FileUrl,
    string? PreviewImageUrl,
    string? Note,
    string? ReviewNote,
    string Status,
    Guid? ReviewedBy,
    string? ReviewedByName,
    DateTime? ReviewedAt,
    DateTime? SubmittedAt);

public record ReviewSubmissionRequest(
    [Required] bool Approve,
    string? Note);

public record AssistantEarningsResponse(
    int ApprovedSubmissions,
    int ApprovedPages,
    decimal TotalEarnings,
    decimal PaidEarnings,
    string Month);
