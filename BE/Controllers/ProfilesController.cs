using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
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

    /// <summary>Danh sách profile — Admin.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<ProfileResponse>>> List(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var profiles = await _profileService.ListAllAsync(callerId, cancellationToken);
        return Ok(profiles);
    }

    /// <summary>Danh sách assistant — Mangaka.</summary>
    [HttpGet("assistants")]
    [ProducesResponseType(typeof(IReadOnlyList<ProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<ProfileResponse>>> ListAssistants(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var profiles = await _profileService.ListByRoleAsync(
            callerId,
            ProfileRoles.Mangaka,
            ProfileRoles.Assistant,
            cancellationToken);
        return Ok(profiles);
    }

    /// <summary>Danh sách editor — Admin.</summary>
    [HttpGet("editors")]
    [ProducesResponseType(typeof(IReadOnlyList<ProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<ProfileResponse>>> ListEditors(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var profiles = await _profileService.ListByRoleAsync(
            callerId,
            ProfileRoles.Admin,
            ProfileRoles.Editor,
            cancellationToken);
        return Ok(profiles);
    }

    /// <summary>Chi tiết profile — mọi user đã đăng nhập.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var profile = await _profileService.GetByIdForCallerAsync(callerId, id, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>Cập nhật profile — Owner hoặc Admin.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> Update(
        Guid id,
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var updated = await _profileService.UpdateByIdAsync(callerId, id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    /// <summary>Vô hiệu hóa profile — Admin.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var deleted = await _profileService.DeleteByIdAsync(callerId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
