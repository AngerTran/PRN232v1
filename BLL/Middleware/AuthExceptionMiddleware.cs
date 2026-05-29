using System.Net;
using System.Text.Json;
using Npgsql;
using BLL.Services.Auth;
using BLL.Services.Profiles;
using BLL.Services.Series;
using BLL.Services.Workflow;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using DAL.Services.Workflow;

namespace BLL.Middleware;

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
            if (ex.StatusCode >= HttpStatusCode.InternalServerError)
            {
                _logger.LogWarning(ex, "Auth service error: {Message}", ex.Message);
            }
            else
            {
                _logger.LogInformation("Auth rejected request with {StatusCode}: {Message}", (int)ex.StatusCode, ex.Message);
            }

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
        catch (SeriesForbiddenException ex)
        {
            _logger.LogWarning(ex, "Series forbidden: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
        catch (WorkflowForbiddenException ex)
        {
            _logger.LogWarning(ex, "Workflow forbidden: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation error: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("Storage upload failed", StringComparison.Ordinal))
        {
            _logger.LogWarning(ex, "Storage upload failed: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                message = ex.Message
            }));
        }
        catch (NpgsqlException ex)
        {
            _logger.LogError(ex, "Database error: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                message = "Database connection failed. Check ConnectionStrings:SupabaseConnection, especially the database password."
            }));
        }
    }
}
