namespace DAL.Common;

/// <summary>
/// Kỳ chi trả cố định: gom thù lao theo tháng, kế toán chi sau khi tháng kết thúc.
/// </summary>
public static class PayrollRules
{
    /// <summary>Ngày chi trả trong tháng sau (giờ Việt Nam).</summary>
    public const int PayoutDayOfMonth = 5;

    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static DateOnly GetPayoutDate(int year, int month)
    {
        if (month == 12)
        {
            return new DateOnly(year + 1, 1, PayoutDayOfMonth);
        }

        return new DateOnly(year, month + 1, PayoutDayOfMonth);
    }

    public static DateOnly GetVietnamToday(DateTime utcNow) =>
        DateOnly.FromDateTime(utcNow.Add(VietnamOffset));

    public static (int Year, int Month) GetVietnamPeriod(DateTime utcDateTime)
    {
        var vn = utcDateTime.Add(VietnamOffset);
        return (vn.Year, vn.Month);
    }

    /// <summary>Admin chỉ được đánh dấu đã chi từ ngày chi trả của kỳ đó trở đi.</summary>
    public static bool CanMarkPeriodPaid(int year, int month, DateTime utcNow) =>
        GetVietnamToday(utcNow) >= GetPayoutDate(year, month);

    public static string FormatPayoutDate(int year, int month) =>
        GetPayoutDate(year, month).ToString("dd/MM/yyyy");
}
