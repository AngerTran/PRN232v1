namespace DAL.Common;

public static class PaymentStatuses
{
    public const string Unpaid = "unpaid";
    public const string Pending = "pending";
    public const string Paid = "paid";
    public const string Failed = "failed";

    public static readonly string[] All = [Unpaid, Pending, Paid, Failed];

    public static bool IsValid(string status) =>
        !string.IsNullOrWhiteSpace(status) &&
        All.Contains(status.Trim(), StringComparer.OrdinalIgnoreCase);
}