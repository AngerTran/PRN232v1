using System.ComponentModel.DataAnnotations;

namespace PRN232v1.Dtos.Profiles;

public record ProfileResponse(
    Guid Id,
    Guid? OrgId,
    string? FullName,
    string Role,
    string? AvatarUrl,
    bool? EmailNotifEnabled,
    bool? PushNotifEnabled,
    DateTime? CreatedAt);

public record CreateProfileRequest(
    [Required] Guid Id,
    [Required, MaxLength(50)] string Role,
    [MaxLength(255)] string? FullName,
    Guid? OrgId,
    string? AvatarUrl);

public record UpdateProfileRequest(
    [MaxLength(255)] string? FullName,
    [MaxLength(50)] string? Role,
    Guid? OrgId,
    string? AvatarUrl,
    bool? EmailNotifEnabled,
    bool? PushNotifEnabled);
