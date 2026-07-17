using System.Globalization;

namespace DAL.Common;

/// <summary>
/// Kỳ xếp hạng = đợt phát hành chung (kiểu số tạp chí), suy ra từ ngày XB — không lấy theo số chương.
/// Weekly: 1_000_000 + nămISO*100 + tuầnISO (vd. 12026029 = 2026 tuần 29).
/// Monthly: 2_000_000 + năm*100 + tháng (vd. 2202607 = 2026 tháng 7).
/// </summary>
public static class PublishingIssueNumbers
{
    public const int WeeklyOffset = 1_000_000;
    public const int MonthlyOffset = 2_000_000;

    public static int FromPublishDate(DateOnly publishDate, PublishingFrequency frequency)
    {
        if (frequency == PublishingFrequency.Monthly)
        {
            return MonthlyOffset + publishDate.Year * 100 + publishDate.Month;
        }

        var date = publishDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        var year = ISOWeek.GetYear(date);
        var week = ISOWeek.GetWeekOfYear(date);
        return WeeklyOffset + year * 100 + week;
    }

    public static string FormatLabel(int? issueNumber)
    {
        if (issueNumber is null or <= 0)
        {
            return "—";
        }

        var n = issueNumber.Value;
        if (n >= MonthlyOffset)
        {
            var body = n - MonthlyOffset;
            var year = body / 100;
            var month = body % 100;
            return $"{year} · Tháng {month:00}";
        }

        if (n >= WeeklyOffset)
        {
            var body = n - WeeklyOffset;
            var year = body / 100;
            var week = body % 100;
            return $"{year} · Tuần {week:00}";
        }

        // Dữ liệu cũ (kỳ = số chương).
        return $"Kỳ {n}";
    }
}
