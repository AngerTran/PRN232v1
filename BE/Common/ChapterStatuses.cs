using NpgsqlTypes;

namespace PRN232v1.Common;

public enum ChapterStatus
{
    [PgName("draft")]
    Draft,

    [PgName("in_progress")]
    InProgress,

    [PgName("reviewing")]
    Reviewing,

    [PgName("completed")]
    Completed,

    [PgName("published")]
    Published
}

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

    public static ChapterStatus ParseOrThrow(string status) =>
        status.Trim().ToLowerInvariant() switch
        {
            Draft => ChapterStatus.Draft,
            InProgress => ChapterStatus.InProgress,
            Reviewing => ChapterStatus.Reviewing,
            Completed => ChapterStatus.Completed,
            Published => ChapterStatus.Published,
            _ => throw new ArgumentException($"Invalid chapter status '{status}'.")
        };

    public static string ToDbValue(ChapterStatus status) => status switch
    {
        ChapterStatus.Draft => Draft,
        ChapterStatus.InProgress => InProgress,
        ChapterStatus.Reviewing => Reviewing,
        ChapterStatus.Completed => Completed,
        ChapterStatus.Published => Published,
        _ => Draft
    };
}
