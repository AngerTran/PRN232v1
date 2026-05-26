using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Dtos.Auth;
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

    /// <summary>Đăng ký tài khoản bằng email và mật khẩu.</summary>
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

    /// <summary>Đăng nhập bằng email và mật khẩu.</summary>
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

    /// <summary>Đăng xuất — thu hồi phiên Supabase (gửi kèm Bearer token).</summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequest? request,
        CancellationToken cancellationToken)
    {
        var accessToken = GetBearerToken();
        await _authService.LogoutAsync(accessToken, request?.RefreshToken, cancellationToken);
        return NoContent();
    }

    /// <summary>Làm mới access token bằng refresh token.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthTokenResponse>> Refresh(
        [FromBody] RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken, cancellationToken);
        return Ok(result);
    }

    /// <summary>Thông tin người dùng hiện tại (cần JWT).</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserInfoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserInfoResponse>> Me(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var user = await _profileService.GetUserInfoAsync(userId, cancellationToken: cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    /// <summary>URL Google OAuth (luồng code — redirect về /api/auth/google/callback).</summary>
    [HttpGet("google/url")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(GoogleAuthUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<GoogleAuthUrlResponse> GetGoogleUrl()
    {
        return Ok(_authService.GetGoogleAuthorizationUrl());
    }

    /// <summary>URL đăng nhập Google qua Supabase (bật Google provider trong Supabase Dashboard).</summary>
    [HttpGet("google/supabase-url")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(GoogleAuthUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<GoogleAuthUrlResponse> GetSupabaseGoogleUrl()
    {
        return Ok(_authService.GetSupabaseGoogleAuthorizationUrl());
    }

    /// <summary>Callback Google OAuth — đổi authorization code lấy JWT.</summary>
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

    /// <summary>Đăng nhập Google bằng id_token (Google Sign-In / mobile).</summary>
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

    /// <summary>Đăng nhập Google bằng authorization code (POST thay cho callback GET).</summary>
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

    private bool TryGetUserId(out Guid userId)
    {
        userId = default;
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return sub is not null && Guid.TryParse(sub, out userId);
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
