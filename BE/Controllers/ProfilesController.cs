using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Profiles;
using BLL.Services.Profiles;
using Swashbuckle.AspNetCore.Annotations;

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

    /// <summary>Profile của user đang đăng nhập.</summary>
    [HttpGet("me")]
    [SwaggerOperation(Summary = "Get my profile", Description = "Returns the local profile for the authenticated user.")]
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

    /// <summary>Cập nhật profile của chính mình.</summary>
    [HttpPut("update")]
    [SwaggerOperation(Summary = "Update my profile", Description = "Updates the authenticated user's own profile fields.")]
    [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> UpdateSelf(
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

    /// <summary>Danh sách profile — Admin.</summary>
    [HttpGet]
    [SwaggerOperation(Summary = "List all profiles", Description = "Returns all local profiles. Requires admin role.")]
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
    [SwaggerOperation(Summary = "List assistants", Description = "Returns active assistant profiles. Requires mangaka role.")]
    [ProducesResponseType(typeof(IReadOnlyList<ProfileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<ProfileResponse>>> ListAssistants(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var profiles = await _profileService.ListMyAssistantsAsync(callerId, cancellationToken);
        return Ok(profiles);
    }

    [HttpPost("assistants")]
    [SwaggerOperation(Summary = "Invite assistant", Description = "Sends an invitation to an existing active assistant profile by email.")]
    [ProducesResponseType(typeof(AssistantInvitationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AssistantInvitationResponse>> AddAssistant(
        [FromBody] AddAssistantRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var invitation = await _profileService.InviteAssistantAsync(callerId, request, cancellationToken);
        return Created(string.Empty, invitation);
    }

    [HttpGet("assistants/invitations/sent")]
    public async Task<ActionResult<IReadOnlyList<AssistantInvitationResponse>>> SentInvitations(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId)) return Unauthorized();
        return Ok(await _profileService.ListSentInvitationsAsync(callerId, cancellationToken));
    }

    [HttpGet("assistants/invitations/mine")]
    public async Task<ActionResult<IReadOnlyList<AssistantInvitationResponse>>> MyInvitations(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId)) return Unauthorized();
        return Ok(await _profileService.ListMyInvitationsAsync(callerId, cancellationToken));
    }

    [HttpPatch("assistants/invitations/{mangakaId:guid}/accept")]
    public async Task<ActionResult<AssistantInvitationResponse>> AcceptInvitation(Guid mangakaId, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId)) return Unauthorized();
        var invitation = await _profileService.RespondToInvitationAsync(callerId, mangakaId, true, cancellationToken);
        return invitation is null ? NotFound() : Ok(invitation);
    }

    [HttpPatch("assistants/invitations/{mangakaId:guid}/reject")]
    public async Task<ActionResult<AssistantInvitationResponse>> RejectInvitation(Guid mangakaId, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId)) return Unauthorized();
        var invitation = await _profileService.RespondToInvitationAsync(callerId, mangakaId, false, cancellationToken);
        return invitation is null ? NotFound() : Ok(invitation);
    }

    [HttpDelete("assistants/{assistantId:guid}")]
    [SwaggerOperation(Summary = "Remove my assistant", Description = "Removes an assistant from the authenticated mangaka's studio.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveAssistant(Guid assistantId, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var callerId))
        {
            return Unauthorized();
        }

        var removed = await _profileService.RemoveMyAssistantAsync(callerId, assistantId, cancellationToken);
        return removed ? NoContent() : NotFound();
    }

    /// <summary>Danh sách editor — Admin.</summary>
    [HttpGet("editors")]
    [SwaggerOperation(Summary = "List editors", Description = "Returns active editor profiles. Requires admin role.")]
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
    [SwaggerOperation(Summary = "Get profile by ID", Description = "Returns a profile by ID for an authenticated user.")]
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
    [SwaggerOperation(Summary = "Update profile by ID", Description = "Updates a profile. The owner can update their own profile; admin can update any profile and change role.")]
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
    [SwaggerOperation(Summary = "Deactivate profile", Description = "Marks a profile inactive instead of physically deleting it. Requires admin role.")]
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
