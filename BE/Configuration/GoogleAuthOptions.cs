namespace PRN232v1.Configuration;

public class GoogleAuthOptions
{
    public const string SectionName = "Google";

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>Must match a redirect URI registered in Google Cloud Console.</summary>
    public string RedirectUri { get; set; } = "https://localhost:7054/api/auth/google/callback";
}
