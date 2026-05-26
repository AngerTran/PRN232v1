using System.ComponentModel.DataAnnotations;

namespace PRN232v1.Dtos.Profiles;

public record ProfileResponse(
    Guid Id,
    string Email,
    string FullName,
    string? AvatarUrl,
    string? Bio,
    bool? IsActive,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public record UpdateProfileRequest(
    [MaxLength(255)] string? FullName,
    string? AvatarUrl,
    string? Bio);
