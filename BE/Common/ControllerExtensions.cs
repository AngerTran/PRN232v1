using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace PRN232v1.Common;

public static class ControllerExtensions
{
    public static bool TryGetUserId(this ControllerBase controller, out Guid userId)
    {
        userId = default;
        var sub = controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? controller.User.FindFirstValue("sub");
        return sub is not null && Guid.TryParse(sub, out userId);
    }
}
