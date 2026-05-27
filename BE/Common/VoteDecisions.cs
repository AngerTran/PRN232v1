namespace PRN232v1.Common;

public static class VoteDecisions
{
    public const string Approve = "approve";
    public const string Reject = "reject";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Approve,
        Reject
    };

    public static bool IsValid(string? decision) =>
        !string.IsNullOrWhiteSpace(decision) && All.Contains(decision.Trim());
}
