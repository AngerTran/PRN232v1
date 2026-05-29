using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Auth;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    string? FullName);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record RefreshTokenRequest(
    [Required] string RefreshToken);

public record LogoutRequest(string? RefreshToken);

public record ConfirmEmailRequest(
    string? Token,
    string? TokenHash,
    string Type = "signup");

public record ResendConfirmEmailRequest(
    [Required, EmailAddress] string Email);

public record GoogleIdTokenRequest(
    [Required] string IdToken);

public record GoogleCodeRequest(
    [Required] string Code);

public record SyncProfileRequest(
    string? FullName,
    string? AvatarUrl);

public record AuthTokenResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string TokenType,
    UserInfoResponse User);

public record UserInfoResponse(
    Guid Id,
    string? Email,
    string? FullName,
    string? AvatarUrl,
    string Role,
    bool EmailConfirmed,
    bool? IsActive);

public record GoogleAuthUrlResponse(string AuthorizationUrl);
