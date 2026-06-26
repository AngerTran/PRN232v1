namespace BLL.Dtos.Notifications;

public record NotificationResponse(
    Guid Id,
    string? Title,
    string? Message,
    string? LinkUrl,
    string? Category,
    bool IsRead,
    DateTime? CreatedAt);

public record MarkNotificationReadResponse(Guid Id, bool IsRead);

public record MarkAllNotificationsReadResponse(int UpdatedCount);
