using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace DAL.Common;

public static class ControllerExtensions
{
    public static bool TryGetUserId(this ControllerBase controller, out Guid userId)
    {
        userId = default;
        var sub = controller.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? controller.User.FindFirst("sub")?.Value;
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}
