using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Profiles;

public record ProfileResponse(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    string? AvatarUrl,
    string? Bio,
    bool EmailConfirmed,
    bool? IsActive,
    DateTime? CreatedAt,
    DateTime? UpdatedAt,
    bool IsBoardLead = false);

public record UpdateProfileRequest(
    [MaxLength(255)] string? FullName,
    string? AvatarUrl,
    string? Bio,
    [MaxLength(50)] string? Role,
    bool? IsActive);

public record AddAssistantRequest(
    [EmailAddress, MaxLength(255)] string? Email,
    Guid? AssistantId);

public record AssistantInvitationResponse(
    Guid MangakaId,
    string MangakaName,
    string MangakaEmail,
    Guid AssistantId,
    string AssistantName,
    string AssistantEmail,
    string Status,
    DateTime CreatedAt,
    DateTime? RespondedAt);
