namespace DAL.Common;

public static class SeriesReviewRules
{
    public const int MinimumReviewDecisions = 3;
    /// <summary>Hạn xét duyệt sau khi mangaka nộp (giờ). Thay cho ReviewExpiryDays.</summary>
    public const int ReviewExpiryHours = 48;
    /// <summary>Giữ tương thích chỗ cũ; giá trị quy đổi từ ReviewExpiryHours.</summary>
    public const int ReviewExpiryDays = 2;
    public const int MaxActiveReviewSlots = 3;
    /// <summary>Lead do Admin gán — không còn timeout tự nhận Lead sau duyệt.</summary>
    public const int LeadClaimExpiryDays = 0;
}
