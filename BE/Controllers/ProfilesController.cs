using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Dtos.Profiles;
using PRN232v1.Services.Profiles;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class ProfilesController : ControllerBase
{
    private readonly ProfileService _profileService;

    public ProfilesController(ProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var profile = await _profileService.GetDtoByIdAsync(id, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }
}
