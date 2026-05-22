using PRN232v1.Dtos.Auth;

namespace PRN232v1.Services.Auth;

public interface IAuthService
{
    Task<AuthTokenResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<AuthTokenResponse> LoginWithEmailAsync(LoginRequest request, CancellationToken cancellationToken = default);

    Task<AuthTokenResponse> LoginWithGoogleIdTokenAsync(string idToken, CancellationToken cancellationToken = default);

    Task<AuthTokenResponse> LoginWithGoogleCodeAsync(string code, CancellationToken cancellationToken = default);

    GoogleAuthUrlResponse GetGoogleAuthorizationUrl();

    GoogleAuthUrlResponse GetSupabaseGoogleAuthorizationUrl();

    Task LogoutAsync(string? accessToken, string? refreshToken, CancellationToken cancellationToken = default);

    Task<AuthTokenResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

    Task<UserInfoResponse?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
