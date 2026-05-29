using NpgsqlTypes;

namespace DAL.Common;

public enum PageStatus
{
    [PgName("draft")]
    Draft,

    [PgName("assigned")]
    Assigned,

    [PgName("reviewing")]
    Reviewing,

    [PgName("approved")]
    Approved,

    [PgName("published")]
    Published
}

public static class PageStatuses
{
    public const string Draft = "draft";
    public const string Assigned = "assigned";
    public const string Reviewing = "reviewing";
    public const string Approved = "approved";
    public const string Published = "published";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Draft,
        Assigned,
        Reviewing,
        Approved,
        Published
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && All.Contains(status.Trim());

    public static PageStatus ParseOrThrow(string status) =>
        status.Trim().ToLowerInvariant() switch
        {
            Draft => PageStatus.Draft,
            Assigned => PageStatus.Assigned,
            Reviewing => PageStatus.Reviewing,
            Approved => PageStatus.Approved,
            Published => PageStatus.Published,
            _ => throw new ArgumentException($"Invalid page status '{status}'.")
        };

    public static string ToDbValue(PageStatus status) => status switch
    {
        PageStatus.Draft => Draft,
        PageStatus.Assigned => Assigned,
        PageStatus.Reviewing => Reviewing,
        PageStatus.Approved => Approved,
        PageStatus.Published => Published,
        _ => Draft
    };
}
