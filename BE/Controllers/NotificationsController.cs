using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PRN232v1.Common;
using PRN232v1.Dtos.Notifications;
using PRN232v1.Services.Notifications;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _notificationService;

    public NotificationsController(NotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    [SwaggerOperation(Summary = "List my notifications", Description = "Lists notifications for the authenticated user, optionally filtering to unread notifications only.")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NotificationResponse>>> List(
        [FromQuery] bool? unreadOnly,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _notificationService.ListForUserAsync(userId, unreadOnly, cancellationToken));
    }

    [HttpPatch("{id:guid}/read")]
    [SwaggerOperation(Summary = "Mark notification as read", Description = "Marks one notification as read when it belongs to the authenticated user.")]
    [ProducesResponseType(typeof(MarkNotificationReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MarkNotificationReadResponse>> MarkRead(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var result = await _notificationService.MarkReadAsync(userId, id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("read-all")]
    [SwaggerOperation(Summary = "Mark all notifications as read", Description = "Marks every notification for the authenticated user as read and returns the number updated.")]
    [ProducesResponseType(typeof(MarkAllNotificationsReadResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MarkAllNotificationsReadResponse>> MarkAllRead(
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _notificationService.MarkAllReadAsync(userId, cancellationToken));
    }
}
