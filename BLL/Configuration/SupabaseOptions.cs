namespace BLL.Configuration;

public class SupabaseOptions
{
    public const string SectionName = "Supabase";

    public string Url { get; set; } = string.Empty;
    public string AnonKey { get; set; } = string.Empty;
    public string ServiceRoleKey { get; set; } = string.Empty;
    public string JwtSecret { get; set; } = string.Empty;
    public string EmailRedirectTo { get; set; } = string.Empty;
    public string SeriesCoversBucket { get; set; } = "series-covers";
    public string SubmissionsBucket { get; set; } = "submissions";
    public string ManuscriptsBucket { get; set; } = "submissions";
    public string PageAssetsBucket { get; set; } = "submissions";
}
