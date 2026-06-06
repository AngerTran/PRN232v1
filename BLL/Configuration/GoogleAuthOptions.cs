namespace BLL.Configuration;

public class GoogleAuthOptions
{
    public const string SectionName = "Google";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>OAuth redirect URI registered in Google Cloud (FE callback).</summary>
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>FE origin after OAuth completes (e.g. http://localhost:5173).</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
}
