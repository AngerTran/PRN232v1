namespace BLL.Dtos.Notifications;

public record NotificationResponse(
    Guid Id,
    string? Title,
    string? Message,
    bool IsRead,
    DateTime? CreatedAt);

public record MarkNotificationReadResponse(Guid Id, bool IsRead);

public record MarkAllNotificationsReadResponse(int UpdatedCount);
