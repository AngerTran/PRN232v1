using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using DAL.Common;
using BLL.Configuration;
using BLL.Dtos.Auth;
using BLL.Dtos.Profiles;
using BLL.Services.Auth;
using BLL.Services.Profiles;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly SupabaseAuthService _authService;
    private readonly ProfileService _profileService;
    private readonly GoogleAuthOptions _googleOptions;

    public AuthController(
        SupabaseAuthService authService,
        ProfileService profileService,
        IOptions<GoogleAuthOptions> googleOptions)
    {
        _authService = authService;
        _profileService = profileService;
        _googleOptions = googleOptions.Value;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Register with email",
        Description = "Creates a Supabase Auth account, creates or syncs the local assistant profile, and sends an email confirmation request when required.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthTokenResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Login with email",
        Description = "Authenticates email and password through Supabase Auth, syncs the local profile, and returns access and refresh tokens.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(object), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AuthTokenResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginWithEmailAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Confirm email",
        Description = "Verifies a Supabase email confirmation token or token hash and returns a login session when verification succeeds.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> ConfirmEmail(
        [FromBody] ConfirmEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ConfirmEmailAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("confirm-email")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Confirm email from link",
        Description = "Handles confirmation links that pass token, token_hash, and type through query parameters.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> ConfirmEmailFromLink(
        [FromQuery(Name = "token_hash")] string? tokenHash,
        [FromQuery] string? token,
        [FromQuery] string type,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ConfirmEmailAsync(
            new ConfirmEmailRequest(token, tokenHash, string.IsNullOrWhiteSpace(type) ? "signup" : type),
            cancellationToken);
        return Ok(result);
    }

    [HttpPost("resend-confirm-email")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Resend confirmation email",
        Description = "Requests Supabase to send another signup confirmation email to the specified address.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ResendConfirmEmail(
        [FromBody] ResendConfirmEmailRequest request,
        CancellationToken cancellationToken)
    {
        await _authService.ResendSignupConfirmationEmailAsync(request.Email, cancellationToken);
        return NoContent();
    }

    [HttpPost("logout")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Logout",
        Description = "Invalidates the current Supabase session token. Requires a bearer access token.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequest? request,
        CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(GetBearerToken(), request?.RefreshToken, cancellationToken);
        return NoContent();
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Refresh token",
        Description = "Exchanges a Supabase refresh token for a new access token and refresh token.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> RefreshToken(
        [FromBody] RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken, cancellationToken);
        return Ok(result);
    }

    [HttpPost("sync")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Sync profile",
        Description = "Creates or updates the local profile for the authenticated Supabase user using JWT claims and optional profile fields.")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProfileResponse>> Sync(
        [FromBody] SyncProfileRequest? request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var email = User.FindFirst("email")?.Value;
        var profile = await _profileService.SyncFromAuthAsync(userId, request, email, cancellationToken);
        return Ok(profile);
    }

    [HttpGet("me")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Get my auth profile",
        Description = "Returns the local profile for the authenticated user identified by the JWT sub claim.")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> Me(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var profile = await _profileService.GetDtoByIdAsync(userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("profile")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Update my auth profile",
        Description = "Updates the authenticated user's own profile fields. Role changes are only applied by admin flows.")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var updated = await _profileService.UpdateByIdAsync(userId, userId, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpGet("google/url")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Get Google OAuth URL",
        Description = "Builds a Google OAuth authorization URL using the configured Google client and redirect URI.")]
    [ProducesResponseType(typeof(GoogleAuthUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<GoogleAuthUrlResponse> GetGoogleUrl() =>
        Ok(_authService.GetGoogleAuthorizationUrl());

    [HttpGet("google/supabase-url")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Get Supabase Google OAuth URL",
        Description = "Builds the Supabase-hosted Google OAuth authorization URL with the configured redirect URI.")]
    [ProducesResponseType(typeof(GoogleAuthUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<GoogleAuthUrlResponse> GetSupabaseGoogleUrl() =>
        Ok(_authService.GetSupabaseGoogleAuthorizationUrl());

    [HttpGet("google/callback")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Google OAuth callback",
        Description = "Legacy BE callback: exchanges code and redirects to FE with session tokens in URL hash.")]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] string? code,
        [FromQuery] string? error,
        CancellationToken cancellationToken)
    {
        var frontendBase = (_googleOptions.FrontendBaseUrl ?? "http://localhost:5173").TrimEnd('/');

        if (!string.IsNullOrWhiteSpace(error))
        {
            return Redirect($"{frontendBase}/auth/google/callback?error={Uri.EscapeDataString(error)}");
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return Redirect($"{frontendBase}/auth/google/callback?error={Uri.EscapeDataString("Missing authorization code.")}");
        }

        try
        {
            var result = await _authService.LoginWithGoogleCodeAsync(code, cancellationToken);
            var fragment = string.Join("&", new[]
            {
                $"access_token={Uri.EscapeDataString(result.AccessToken)}",
                $"refresh_token={Uri.EscapeDataString(result.RefreshToken)}",
                $"expires_in={result.ExpiresIn}",
                $"token_type={Uri.EscapeDataString(result.TokenType)}"
            });
            return Redirect($"{frontendBase}/auth/google/callback#{fragment}");
        }
        catch (AuthServiceException ex)
        {
            return Redirect($"{frontendBase}/auth/google/callback?error={Uri.EscapeDataString(ex.Message)}");
        }
    }

    [HttpPost("google")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Login with Google ID token",
        Description = "Authenticates a Google ID token through Supabase Auth and returns a Supabase session.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> LoginWithGoogleIdToken(
        [FromBody] GoogleIdTokenRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginWithGoogleIdTokenAsync(request.IdToken, cancellationToken);
        return Ok(result);
    }

    [HttpPost("google/code")]
    [AllowAnonymous]
    [SwaggerOperation(
        Summary = "Login with Google code",
        Description = "Exchanges a Google authorization code for a Google ID token, then signs in through Supabase Auth.")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> LoginWithGoogleCode(
        [FromBody] GoogleCodeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginWithGoogleCodeAsync(request.Code, cancellationToken);
        return Ok(result);
    }

    private string? GetBearerToken()
    {
        var header = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return header["Bearer ".Length..].Trim();
    }
}
