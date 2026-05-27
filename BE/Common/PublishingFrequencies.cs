namespace PRN232v1.Common;

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
}
