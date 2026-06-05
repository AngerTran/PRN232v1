namespace DAL.Common;

using NpgsqlTypes;

// CLR enum ánh xạ tới Postgres enum `vote_decision` (cột board_votes.decision).
public enum VoteDecisionDb
{
    [PgName("approve")]
    Approve,

    [PgName("reject")]
    Reject
}

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

public static class VoteEnumConversions
{
    public static VoteDecisionDb DecisionFromString(string? value) => value?.Trim() switch
    {
        VoteDecisions.Approve => VoteDecisionDb.Approve,
        VoteDecisions.Reject => VoteDecisionDb.Reject,
        _ => VoteDecisionDb.Approve
    };

    public static string DecisionToString(VoteDecisionDb value) => value switch
    {
        VoteDecisionDb.Approve => VoteDecisions.Approve,
        VoteDecisionDb.Reject => VoteDecisions.Reject,
        _ => VoteDecisions.Approve
    };
}
