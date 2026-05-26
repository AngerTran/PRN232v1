using PRN232v1.Services.Auth;

namespace PRN232v1.Middleware;

public class AuthExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public AuthExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AuthServiceException ex)
        {
            context.Response.StatusCode = (int)ex.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
    }
}
