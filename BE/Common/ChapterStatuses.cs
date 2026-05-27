namespace PRN232v1.Common;

public static class ChapterStatuses
{
    public const string Draft = "draft";
    public const string InProgress = "in_progress";
    public const string Reviewing = "reviewing";
    public const string Completed = "completed";
    public const string Published = "published";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Draft,
        InProgress,
        Reviewing,
        Completed,
        Published
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && All.Contains(status.Trim());
}
