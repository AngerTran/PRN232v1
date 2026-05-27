using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PRN232v1.Configuration;
using PRN232v1.Dtos.Auth;
using PRN232v1.Services.Profiles;

namespace PRN232v1.Services.Auth;

public class SupabaseAuthService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient;
    private readonly ProfileService _profileService;
    private readonly SupabaseOptions _supabase;
    private readonly GoogleAuthOptions _google;
    private readonly ILogger<SupabaseAuthService> _logger;

    public SupabaseAuthService(
        HttpClient httpClient,
        ProfileService profileService,
        IOptions<SupabaseOptions> supabase,
        IOptions<GoogleAuthOptions> google,
        ILogger<SupabaseAuthService> logger)
    {
        _httpClient = httpClient;
        _profileService = profileService;
        _supabase = supabase.Value;
        _google = google.Value;
        _logger = logger;
    }

    public async Task<AuthTokenResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        var email = request.Email.Trim();
        var payload = new
        {
            email,
            password = request.Password,
            data = new { full_name = request.FullName, avatar_url = (string?)null },
            options = BuildEmailOptions()
        };

        using var response = await PostAuthAsync("signup", payload, cancellationToken);
        var signup = await ReadSignupOrThrowAsync(response, cancellationToken);
        await EnsureProfileAsync(signup.User, request.FullName, syncEmailConfirmed: false, cancellationToken);
        await TrySendSignupConfirmationEmailAsync(email, cancellationToken);
        _logger.LogInformation(
            "Register completed for {Email}. EmailConfirmed: {EmailConfirmed}",
            email,
            signup.User?.EmailConfirmedAt is not null || signup.User?.ConfirmedAt is not null);

        if (!string.IsNullOrWhiteSpace(signup.AccessToken))
        {
            return await MapSessionAsync(signup, cancellationToken);
        }

        if (signup.User?.Id is null || !Guid.TryParse(signup.User.Id, out var userId))
        {
            throw new AuthServiceException("Invalid signup response from Supabase.", HttpStatusCode.BadGateway);
        }

        var userInfo = await _profileService.GetUserInfoAsync(userId, signup.User.Email, cancellationToken)
            ?? new UserInfoResponse(
                userId,
                signup.User.Email,
                signup.User.UserMetadata?.FullName ?? request.FullName,
                signup.User.UserMetadata?.AvatarUrl,
                "assistant",
                false,
                true);

        return new AuthTokenResponse(
            string.Empty,
            string.Empty,
            0,
            "bearer",
            userInfo);
    }

    public async Task<AuthTokenResponse> LoginWithEmailAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        var payload = new { email = request.Email.Trim(), password = request.Password };
        using var response = await PostAuthAsync("token?grant_type=password", payload, cancellationToken);
        var session = await ReadSessionOrThrowAsync(response, cancellationToken);
        await EnsureProfileAsync(session.User, null, cancellationToken: cancellationToken);
        return await MapSessionAsync(session, cancellationToken);
    }

    public async Task<AuthTokenResponse> LoginWithGoogleIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        var payload = new { provider = "google", id_token = idToken };
        using var response = await PostAuthAsync("token?grant_type=id_token", payload, cancellationToken);
        var session = await ReadSessionOrThrowAsync(response, cancellationToken);
        await EnsureProfileAsync(session.User, null, cancellationToken: cancellationToken);
        return await MapSessionAsync(session, cancellationToken);
    }

    public async Task<AuthTokenResponse> LoginWithGoogleCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        EnsureGoogleConfigured();

        var tokenRequest = new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _google.ClientId,
            ["client_secret"] = _google.ClientSecret,
            ["redirect_uri"] = _google.RedirectUri,
            ["grant_type"] = "authorization_code"
        };

        using var googleResponse = await _httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(tokenRequest),
            cancellationToken);

        if (!googleResponse.IsSuccessStatusCode)
        {
            var error = await googleResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Google token exchange failed: {Error}", error);
            throw new AuthServiceException("Google authorization code is invalid or expired.", HttpStatusCode.BadRequest);
        }

        var googleToken = await googleResponse.Content.ReadFromJsonAsync<GoogleTokenPayload>(JsonOptions, cancellationToken)
            ?? throw new AuthServiceException("Empty response from Google token endpoint.", HttpStatusCode.BadGateway);

        if (string.IsNullOrWhiteSpace(googleToken.IdToken))
        {
            throw new AuthServiceException("Google did not return an id_token.", HttpStatusCode.BadGateway);
        }

        return await LoginWithGoogleIdTokenAsync(googleToken.IdToken, cancellationToken);
    }

    public GoogleAuthUrlResponse GetGoogleAuthorizationUrl()
    {
        EnsureGoogleConfigured();

        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _google.ClientId,
            ["redirect_uri"] = _google.RedirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["access_type"] = "offline",
            ["prompt"] = "consent"
        };

        var url = "https://accounts.google.com/o/oauth2/v2/auth?" + string.Join("&",
            query.Where(kv => !string.IsNullOrEmpty(kv.Value))
                .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));

        return new GoogleAuthUrlResponse(url);
    }

    public GoogleAuthUrlResponse GetSupabaseGoogleAuthorizationUrl()
    {
        EnsureSupabaseConfigured();
        EnsureGoogleConfigured();

        var redirectTo = Uri.EscapeDataString(_google.RedirectUri);
        var url = $"{_supabase.Url.TrimEnd('/')}/auth/v1/authorize?provider=google&redirect_to={redirectTo}";
        return new GoogleAuthUrlResponse(url);
    }

    public async Task LogoutAsync(string? accessToken, string? refreshToken, CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, BuildAuthUri("logout"));
        request.Headers.Add("apikey", _supabase.AnonKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            request.Content = JsonContent.Create(new { refresh_token = refreshToken }, options: JsonOptions);
        }

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Supabase logout returned {Status}: {Body}", response.StatusCode, body);
        }
    }

    public async Task<AuthTokenResponse> ConfirmEmailAsync(
        ConfirmEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        if (string.IsNullOrWhiteSpace(request.Token) && string.IsNullOrWhiteSpace(request.TokenHash))
        {
            throw new AuthServiceException("Token or token_hash is required.", HttpStatusCode.BadRequest);
        }

        var payload = new Dictionary<string, string>
        {
            ["type"] = string.IsNullOrWhiteSpace(request.Type) ? "signup" : request.Type
        };

        if (!string.IsNullOrWhiteSpace(request.TokenHash))
        {
            payload["token_hash"] = request.TokenHash;
        }
        else
        {
            payload["token"] = request.Token!;
        }

        using var response = await PostAuthAsync("verify", payload, cancellationToken);
        var session = await ReadSessionOrThrowAsync(response, cancellationToken);
        await EnsureProfileAsync(session.User, null, cancellationToken: cancellationToken);

        if (Guid.TryParse(session.User?.Id, out var userId))
        {
            await _profileService.ConfirmEmailAsync(userId, cancellationToken);
        }

        return await MapSessionAsync(session, cancellationToken);
    }

    public async Task<AuthTokenResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        var payload = new { refresh_token = refreshToken };
        using var response = await PostAuthAsync("token?grant_type=refresh_token", payload, cancellationToken);
        var session = await ReadSessionOrThrowAsync(response, cancellationToken);
        return await MapSessionAsync(session, cancellationToken);
    }

    public async Task ResendSignupConfirmationEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        EnsureSupabaseConfigured();

        using var response = await SendSignupConfirmationEmailAsync(email.Trim(), cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var message = TryParseSupabaseError(body) ?? "Could not resend confirmation email.";
        throw new AuthServiceException(message, HttpStatusCode.BadRequest);
    }

    private async Task TrySendSignupConfirmationEmailAsync(string email, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Requesting Supabase signup confirmation email for {Email}.", email);

        using var response = await SendSignupConfirmationEmailAsync(email, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation(
                "Supabase accepted signup confirmation email request for {Email}. Status: {Status}",
                email,
                response.StatusCode);
            return;
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning(
            "Supabase confirmation email resend failed for {Email}. Status: {Status}. Body: {Body}",
            email,
            response.StatusCode,
            body);
    }

    private Task<HttpResponseMessage> SendSignupConfirmationEmailAsync(string email, CancellationToken cancellationToken)
    {
        var payload = new
        {
            type = "signup",
            email,
            options = BuildEmailOptions()
        };

        return PostAuthAsync("resend", payload, cancellationToken);
    }

    private object? BuildEmailOptions() =>
        string.IsNullOrWhiteSpace(_supabase.EmailRedirectTo)
            ? null
            : new { email_redirect_to = _supabase.EmailRedirectTo };

    private async Task<HttpResponseMessage> PostAuthAsync(string path, object payload, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BuildAuthUri(path));
        request.Headers.Add("apikey", _supabase.AnonKey);
        request.Content = JsonContent.Create(payload, options: JsonOptions);
        return await _httpClient.SendAsync(request, cancellationToken);
    }

    private Uri BuildAuthUri(string path) =>
        new($"{_supabase.Url.TrimEnd('/')}/auth/v1/{path.TrimStart('/')}");

    private async Task<SupabaseSession> ReadSessionOrThrowAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var message = TryParseSupabaseError(body) ?? "Authentication failed.";
            var status = response.StatusCode == HttpStatusCode.Unauthorized
                || string.Equals(message, "Invalid login credentials", StringComparison.OrdinalIgnoreCase)
                ? HttpStatusCode.Unauthorized
                : HttpStatusCode.BadRequest;
            throw new AuthServiceException(message, status);
        }

        var session = JsonSerializer.Deserialize<SupabaseSession>(body, JsonOptions);
        if (session?.AccessToken is not null && session.User?.Id is not null)
        {
            return session;
        }

        if (TryGetSignupWithoutSessionMessage(body, out var signupMessage))
        {
            throw new AuthServiceException(signupMessage, HttpStatusCode.BadRequest);
        }

        _logger.LogWarning("Unexpected Supabase auth response shape: {Body}", body);
        throw new AuthServiceException("Invalid authentication response from Supabase.", HttpStatusCode.BadGateway);
    }

    private static bool TryGetSignupWithoutSessionMessage(string body, out string message)
    {
        message = string.Empty;
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            if (!root.TryGetProperty("id", out _) || root.TryGetProperty("access_token", out _))
            {
                return false;
            }

            if (root.TryGetProperty("confirmation_sent_at", out _) ||
                root.TryGetProperty("email", out _))
            {
                message = "Account created. Confirm your email in Supabase, then use POST /api/auth/login.";
                return true;
            }
        }
        catch (JsonException)
        {
        }

        return false;
    }

    private async Task<SupabaseSession> ReadSignupOrThrowAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var message = TryParseSupabaseError(body) ?? "Authentication failed.";
            var status = response.StatusCode == HttpStatusCode.Unauthorized
                || string.Equals(message, "Invalid login credentials", StringComparison.OrdinalIgnoreCase)
                ? HttpStatusCode.Unauthorized
                : HttpStatusCode.BadRequest;
            throw new AuthServiceException(message, status);
        }

        var signup = JsonSerializer.Deserialize<SupabaseSession>(body, JsonOptions);
        if (signup?.User?.Id is not null)
        {
            return signup;
        }

        var user = JsonSerializer.Deserialize<SupabaseUser>(body, JsonOptions);
        if (user?.Id is not null)
        {
            return new SupabaseSession
            {
                User = user
            };
        }

        _logger.LogWarning("Unexpected Supabase signup response body: {Body}", body);
        throw new AuthServiceException("Invalid signup response from Supabase.", HttpStatusCode.BadGateway);
    }

    private static string? TryParseSupabaseError(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("msg", out var msg))
            {
                return msg.GetString();
            }

            if (doc.RootElement.TryGetProperty("error_description", out var desc))
            {
                return desc.GetString();
            }

            if (doc.RootElement.TryGetProperty("message", out var message))
            {
                return message.GetString();
            }
        }
        catch (JsonException)
        {
        }

        return null;
    }

    private async Task EnsureProfileAsync(
        SupabaseUser? user,
        string? fullName,
        bool syncEmailConfirmed = true,
        CancellationToken cancellationToken = default)
    {
        if (user?.Id is null || !Guid.TryParse(user.Id, out var userId) || string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        var name = fullName ?? user.UserMetadata?.FullName;
        var avatar = user.UserMetadata?.AvatarUrl;
        var emailConfirmed = syncEmailConfirmed
            && (user.EmailConfirmedAt is not null || user.ConfirmedAt is not null);

        await _profileService.EnsureExistsForAuthAsync(
            userId,
            user.Email,
            name,
            avatar,
            emailConfirmed,
            cancellationToken);
    }

    private async Task<AuthTokenResponse> MapSessionAsync(SupabaseSession session, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(session.User!.Id, out var userId))
        {
            throw new AuthServiceException("Invalid user id in token.", HttpStatusCode.BadGateway);
        }

        var userInfo = await _profileService.GetUserInfoAsync(userId, session.User.Email, cancellationToken)
            ?? new UserInfoResponse(
                userId,
                session.User.Email,
                session.User.UserMetadata?.FullName,
                session.User.UserMetadata?.AvatarUrl,
                "assistant",
                session.User.EmailConfirmedAt is not null || session.User.ConfirmedAt is not null,
                true);

        return new AuthTokenResponse(
            session.AccessToken!,
            session.RefreshToken ?? string.Empty,
            session.ExpiresIn ?? 3600,
            session.TokenType ?? "bearer",
            userInfo);
    }

    private void EnsureSupabaseConfigured()
    {
        if (string.IsNullOrWhiteSpace(_supabase.Url) || string.IsNullOrWhiteSpace(_supabase.AnonKey))
        {
            throw new AuthServiceException(
                "Supabase is not configured. Set Supabase:Url and Supabase:AnonKey in appsettings.",
                HttpStatusCode.ServiceUnavailable);
        }
    }

    private void EnsureGoogleConfigured()
    {
        if (string.IsNullOrWhiteSpace(_google.ClientId) || string.IsNullOrWhiteSpace(_google.ClientSecret))
        {
            throw new AuthServiceException(
                "Google OAuth is not configured. Set Google:ClientId and Google:ClientSecret in appsettings.",
                HttpStatusCode.ServiceUnavailable);
        }
    }

    private sealed class SupabaseSession
    {
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public int? ExpiresIn { get; set; }
        public string? TokenType { get; set; }
        public SupabaseUser? User { get; set; }
    }

    private sealed class SupabaseUser
    {
        public string? Id { get; set; }
        public string? Email { get; set; }
        public SupabaseUserMetadata? UserMetadata { get; set; }
        public DateTime? EmailConfirmedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
    }

    private sealed class SupabaseUserMetadata
    {
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
    }

    private sealed class GoogleTokenPayload
    {
        public string? IdToken { get; set; }
    }
}

public class AuthServiceException : Exception
{
    public HttpStatusCode StatusCode { get; }

    public AuthServiceException(string message, HttpStatusCode statusCode) : base(message)
    {
        StatusCode = statusCode;
    }
}

