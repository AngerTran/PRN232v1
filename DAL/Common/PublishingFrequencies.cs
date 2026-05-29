using NpgsqlTypes;
namespace DAL.Common;
public enum PublishingFrequency
{
    [PgName("weekly")]
    Weekly,

    [PgName("monthly")]
    Monthly
}

public static class PublishingFrequencies
{
    public const string Weekly = "weekly";
    public const string Monthly = "monthly";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Weekly,
        Monthly
    };

    public static bool IsValid(string? frequency) =>
        !string.IsNullOrWhiteSpace(frequency) && All.Contains(frequency.Trim());

    public static PublishingFrequency ParseOrDefault(string? frequency) =>
        frequency?.Trim().ToLowerInvariant() switch
        {
            Monthly => PublishingFrequency.Monthly,
            Weekly => PublishingFrequency.Weekly,
            _ => PublishingFrequency.Weekly
        };

    public static string ToDbValue(PublishingFrequency frequency) => frequency switch
    {
        PublishingFrequency.Monthly => Monthly,
        PublishingFrequency.Weekly => Weekly,
        _ => Weekly
    };
}
