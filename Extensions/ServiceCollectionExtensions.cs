using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PRN232v1.Configuration;
using PRN232v1.Services.Auth;

namespace PRN232v1.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddAppAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SupabaseOptions>(configuration.GetSection(SupabaseOptions.SectionName));
        services.Configure<GoogleAuthOptions>(configuration.GetSection(GoogleAuthOptions.SectionName));

        services.AddHttpClient<IAuthService, SupabaseAuthService>();

        var supabase = configuration.GetSection(SupabaseOptions.SectionName).Get<SupabaseOptions>() ?? new SupabaseOptions();
        var jwtSecret = supabase.JwtSecret;

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = true;
                options.SaveToken = true;

                if (string.IsNullOrWhiteSpace(jwtSecret))
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = false,
                        ValidateIssuerSigningKey = false,
                        SignatureValidator = (token, _) => new Microsoft.IdentityModel.JsonWebTokens.JsonWebToken(token)
                    };
                    return;
                }

                var issuer = $"{supabase.Url.TrimEnd('/')}/auth/v1";
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = "authenticated",
                    ValidateLifetime = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    NameClaimType = "sub",
                    RoleClaimType = "role"
                };
            });

        services.AddAuthorization();
        return services;
    }
}
