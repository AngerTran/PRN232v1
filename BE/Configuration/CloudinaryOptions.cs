namespace PRN232v1.Configuration;

public class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
    public string UploadPreset { get; set; } = string.Empty;
    public string Folder { get; set; } = "prn232";
}
