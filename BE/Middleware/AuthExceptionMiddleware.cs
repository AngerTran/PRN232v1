using System.Net;
using System.Text.Json;
using PRN232v1.Services.Auth;
using PRN232v1.Services.Profiles;

namespace PRN232v1.Middleware;

public class AuthExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthExceptionMiddleware> _logger;

    public AuthExceptionMiddleware(RequestDelegate next, ILogger<AuthExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AuthServiceException ex)
        {
            _logger.LogWarning(ex, "Auth error: {Message}", ex.Message);
            context.Response.StatusCode = (int)ex.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
        catch (ProfileForbiddenException ex)
        {
            _logger.LogWarning(ex, "Profile forbidden: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
    }
}
