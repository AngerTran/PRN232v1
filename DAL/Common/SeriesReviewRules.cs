namespace DAL.Common;

public static class SeriesReviewRules
{
    public const int MinimumReviewDecisions = 3;
    public const int ReviewExpiryDays = 30;
    public const int MaxActiveReviewSlots = 3;
    /// <summary>Sau khi series được duyệt, reviewer có 7 ngày để nhận Lead; hết hạn thì tự gán người claim sớm nhất.</summary>
    public const int LeadClaimExpiryDays = 7;
}
