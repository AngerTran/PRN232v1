using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Auth;
using PRN232v1.Dtos.Profiles;
using PRN232v1.Services.Auth;
using PRN232v1.Services.Profiles;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly SupabaseAuthService _authService;
    private readonly ProfileService _profileService;

    public AuthController(SupabaseAuthService authService, ProfileService profileService)
    {
        _authService = authService;
        _profileService = profileService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginWithEmailAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
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
    [ProducesResponseType(typeof(GoogleAuthUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<GoogleAuthUrlResponse> GetGoogleUrl() =>
        Ok(_authService.GetGoogleAuthorizationUrl());

    [HttpGet("google/supabase-url")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(GoogleAuthUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<GoogleAuthUrlResponse> GetSupabaseGoogleUrl() =>
        Ok(_authService.GetSupabaseGoogleAuthorizationUrl());

    [HttpGet("google/callback")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> GoogleCallback(
        [FromQuery] string code,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginWithGoogleCodeAsync(code, cancellationToken);
        return Ok(result);
    }

    [HttpPost("google")]
    [AllowAnonymous]
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
