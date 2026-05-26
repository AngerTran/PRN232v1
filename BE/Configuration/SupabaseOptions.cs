namespace PRN232v1.Configuration;

public class SupabaseOptions
{
    public const string SectionName = "Supabase";

    public string Url { get; set; } = string.Empty;

    public string AnonKey { get; set; } = string.Empty;

    /// <summary>JWT secret from Supabase Dashboard → Settings → API (JWT Settings).</summary>
    public string JwtSecret { get; set; } = string.Empty;
}
