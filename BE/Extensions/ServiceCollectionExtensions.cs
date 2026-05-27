using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PRN232v1.Configuration;
using PRN232v1.Repositories;
using PRN232v1.Services.Annotations;
using PRN232v1.Services.Auth;
using PRN232v1.Services.Board;
using PRN232v1.Services.Notifications;
using PRN232v1.Services.Profiles;
using PRN232v1.Services.Rankings;
using PRN232v1.Services.Schedules;
using PRN232v1.Services.Series;
using PRN232v1.Services.Submissions;
using PRN232v1.Services.Tasks;
using PRN232v1.Services.Storage;
using PRN232v1.Services.Workflow;

namespace PRN232v1.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRepositoriesAndServices(this IServiceCollection services)
    {
        services.AddScoped<UnitOfWork>();
        services.AddScoped<ProfileService>();
        services.AddScoped<NotificationService>();
        services.AddScoped<PageAccessService>();
        services.AddScoped<TaskService>();
        services.AddScoped<SubmissionService>();
        services.AddScoped<AnnotationService>();
        services.AddScoped<BoardService>();
        services.AddScoped<RankingService>();
        services.AddScoped<PublishingScheduleService>();
        services.AddScoped<SeriesService>();
        services.AddHttpClient<SupabaseAuthService>();
        services.AddHttpClient<SupabaseStorageService>();
        return services;
    }

    public static IServiceCollection AddAppAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SupabaseOptions>(configuration.GetSection(SupabaseOptions.SectionName));
        services.Configure<GoogleAuthOptions>(configuration.GetSection(GoogleAuthOptions.SectionName));

        var supabase = configuration.GetSection(SupabaseOptions.SectionName).Get<SupabaseOptions>() ?? new SupabaseOptions();
        var jwtSecret = supabase.JwtSecret;
        var authority = string.IsNullOrWhiteSpace(supabase.Url)
            ? null
            : $"{supabase.Url.TrimEnd('/')}/auth/v1";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = true;
                options.SaveToken = true;
                options.MapInboundClaims = false;

                if (!string.IsNullOrWhiteSpace(jwtSecret))
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = authority,
                        ValidateAudience = true,
                        ValidAudience = "authenticated",
                        ValidateLifetime = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                        NameClaimType = "sub",
                        RoleClaimType = "role"
                    };
                    return;
                }

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
