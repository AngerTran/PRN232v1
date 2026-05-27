namespace PRN232v1.Common;

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

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && All.Contains(status.Trim());
}
