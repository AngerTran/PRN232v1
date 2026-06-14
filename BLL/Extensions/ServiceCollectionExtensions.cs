using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using BLL.Configuration;
using DAL.Repositories;
using BLL.Services.ActivityLogs;
using BLL.Services.Annotations;
using BLL.Services.Auth;
using BLL.Services.Board;
using BLL.Services.Notifications;
using BLL.Services.Pages;
using BLL.Services.Profiles;
using BLL.Services.Rankings;
using BLL.Services.Schedules;
using BLL.Services.Series;
using BLL.Services.Submissions;
using BLL.Services.Tasks;
using BLL.Services.Storage;
using BLL.Services.Workflow;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

namespace BLL.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRepositoriesAndServices(this IServiceCollection services)
    {
        services.AddScoped<UnitOfWork>();
        services.AddScoped<ProfileService>();
        services.AddScoped<ActivityLogService>();
        services.AddScoped<NotificationService>();
        services.AddScoped<PageService>();
        services.AddScoped<PageAccessService>();
        services.AddScoped<TaskService>();
        services.AddScoped<SubmissionService>();
        services.AddScoped<AnnotationService>();
        services.AddScoped<BoardService>();
        services.AddScoped<RankingService>();
        services.AddScoped<PublishingScheduleService>();
        services.AddScoped<SeriesService>();
        services.AddScoped<VnPayService>();
        services.AddHttpClient<SupabaseAuthService>();
        services.AddHttpClient<SupabaseStorageService>();
        return services;
    }

    public static IServiceCollection AddAppAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SupabaseOptions>(configuration.GetSection(SupabaseOptions.SectionName));
        services.Configure<GoogleAuthOptions>(configuration.GetSection(GoogleAuthOptions.SectionName));
        services.Configure<CloudinaryOptions>(configuration.GetSection(CloudinaryOptions.SectionName));
        services.Configure<VnPayOptions>(configuration.GetSection(VnPayOptions.SectionName));

        var supabase = configuration.GetSection(SupabaseOptions.SectionName).Get<SupabaseOptions>() ?? new SupabaseOptions();
        var authority = string.IsNullOrWhiteSpace(supabase.Url)
            ? null
            : $"{supabase.Url.TrimEnd('/')}/auth/v1";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = true;
                options.SaveToken = true;
                options.MapInboundClaims = false;

                if (!string.IsNullOrWhiteSpace(authority))
                {
                    options.Authority = authority;
                    options.MetadataAddress = $"{authority}/.well-known/openid-configuration";
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = authority,
                        ValidateAudience = true,
                        ValidAudience = "authenticated",
                        ValidateLifetime = true,
                        NameClaimType = "sub",
                        RoleClaimType = "role"
                    };
                    return;
                }

                if (!string.IsNullOrWhiteSpace(supabase.JwtSecret))
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = authority,
                        ValidateAudience = true,
                        ValidAudience = "authenticated",
                        ValidateLifetime = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supabase.JwtSecret)),
                        NameClaimType = "sub",
                        RoleClaimType = "role"
                    };
                    return;
                }

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = false,
                    ValidateIssuerSigningKey = false,
                    SignatureValidator = (token, _) => new Microsoft.IdentityModel.JsonWebTokens.JsonWebToken(token)
                };
            });

        services.AddAuthorization();
        return services;
    }
}
