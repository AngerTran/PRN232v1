using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Dtos.Auth;
using PRN232v1.Services.Profiles;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class HomeController : ControllerBase
{
    private readonly ProfileService _profileService;

    public HomeController(ProfileService profileService)
    {
        _profileService = profileService;
    }

    /// <summary>Trang chủ API — công khai; trả thêm thông tin user nếu đã đăng nhập.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HomeResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<HomeResponse>> Get(CancellationToken cancellationToken)
    {
        UserInfoResponse? user = null;
        var isAuthenticated = User.Identity?.IsAuthenticated == true;

        if (isAuthenticated)
        {
            var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (sub is not null && Guid.TryParse(sub, out var userId))
            {
                user = await _profileService.GetUserInfoAsync(userId, cancellationToken: cancellationToken);
            }
        }

        return Ok(new HomeResponse(
            "Welcome to PRN232 API",
            isAuthenticated,
            user));
    }
}
