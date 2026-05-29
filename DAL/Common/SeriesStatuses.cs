using NpgsqlTypes;
namespace DAL.Common;

public enum SeriesStatus
{
    [PgName("draft")]
    Draft,

    [PgName("pending_review")]
    PendingReview,

    [PgName("approved")]
    Approved,

    [PgName("publishing")]
    Publishing,

    [PgName("hiatus")]
    Hiatus,

    [PgName("cancelled")]
    Cancelled,

    [PgName("completed")]
    Completed
}

public static class SeriesStatuses
{
    public const string Draft = "draft";
    public const string PendingReview = "pending_review";
    public const string Approved = "approved";
    public const string Publishing = "publishing";
    public const string Hiatus = "hiatus";
    public const string Cancelled = "cancelled";
    public const string Completed = "completed";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Draft,
        PendingReview,
        Approved,
        Publishing,
        Hiatus,
        Cancelled,
        Completed
    };

    public static readonly IReadOnlySet<string> PublicVisible = new HashSet<string>(StringComparer.Ordinal)
    {
        Approved,
        Publishing,
        Completed
    };

    public static readonly IReadOnlySet<SeriesStatus> PublicVisibleValues = new HashSet<SeriesStatus>
    {
        SeriesStatus.Approved,
        SeriesStatus.Publishing,
        SeriesStatus.Completed
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && All.Contains(status.Trim());

    public static SeriesStatus ParseOrThrow(string status) =>
        status.Trim().ToLowerInvariant() switch
        {
            Draft => SeriesStatus.Draft,
            PendingReview => SeriesStatus.PendingReview,
            Approved => SeriesStatus.Approved,
            Publishing => SeriesStatus.Publishing,
            Hiatus => SeriesStatus.Hiatus,
            Cancelled => SeriesStatus.Cancelled,
            Completed => SeriesStatus.Completed,
            _ => throw new ArgumentException($"Invalid series status '{status}'.")
        };

    public static string ToDbValue(SeriesStatus status) => status switch
    {
        SeriesStatus.Draft => Draft,
        SeriesStatus.PendingReview => PendingReview,
        SeriesStatus.Approved => Approved,
        SeriesStatus.Publishing => Publishing,
        SeriesStatus.Hiatus => Hiatus,
        SeriesStatus.Cancelled => Cancelled,
        SeriesStatus.Completed => Completed,
        _ => Draft
    };
}
