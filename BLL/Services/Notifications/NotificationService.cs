using Microsoft.EntityFrameworkCore;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using DAL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Dtos.Notifications;
using BLL.Services.Profiles;

namespace BLL.Services.Notifications;

public class NotificationService
{
    private readonly UnitOfWork _unitOfWork;
    private Repository<Notification> Repository => _unitOfWork.Repository<Notification>();

    public NotificationService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<NotificationResponse>> ListForUserAsync(
        Guid userId,
        bool? unreadOnly,
        CancellationToken cancellationToken = default)
    {
        await EnsureUserExistsAsync(userId, cancellationToken);

        var query = _unitOfWork.Context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly == true)
        {
            query = query.Where(n => n.IsRead != true);
        }

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationResponse(
                n.Id,
                n.Title,
                n.Message,
                n.IsRead == true,
                n.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<MarkNotificationReadResponse?> MarkReadAsync(
        Guid userId,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        var notification = await Repository.GetByIdAsync(notificationId, asNoTracking: false, cancellationToken);
        if (notification is null || notification.UserId != userId)
        {
            return null;
        }

        notification.IsRead = true;
        Repository.Update(notification);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new MarkNotificationReadResponse(notification.Id, true);
    }

    public async Task<MarkAllNotificationsReadResponse> MarkAllReadAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureUserExistsAsync(userId, cancellationToken);

        var unread = await _unitOfWork.Context.Notifications
            .Where(n => n.UserId == userId && n.IsRead != true)
            .ToListAsync(cancellationToken);

        foreach (var notification in unread)
        {
            notification.IsRead = true;
            Repository.Update(notification);
        }

        if (unread.Count > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new MarkAllNotificationsReadResponse(unread.Count);
    }

    private async Task EnsureUserExistsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var exists = await _unitOfWork.Repository<Profile>()
            .AnyAsync(p => p.Id == userId, cancellationToken);
        if (!exists)
        {
            throw new ProfileForbiddenException("Caller profile not found.");
        }
    }
}
