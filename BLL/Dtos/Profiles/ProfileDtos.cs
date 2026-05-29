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
    DateTime? UpdatedAt);

public record UpdateProfileRequest(
    [MaxLength(255)] string? FullName,
    string? AvatarUrl,
    string? Bio,
    [MaxLength(50)] string? Role);
