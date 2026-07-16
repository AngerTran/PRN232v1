using System.Text.RegularExpressions;

namespace DAL.Common;

public static class TaskTypes
{
    public const string Background = "background";
    public const string Shading = "shading";
    public const string Cleanup = "cleanup";
    public const string SpeechBubble = "speech_bubble";
    public const string Effects = "effects";
    public const string Lineart = "lineart";
    public const string Other = "other";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Background, Shading, Cleanup, SpeechBubble, Effects, Lineart, Other
    };

    /// <summary>Nhãn mặc định khi seed / khi chưa có display_name trong DB.</summary>
    public static readonly IReadOnlyDictionary<string, string> DefaultDisplayNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [Background] = "Nền",
            [Shading] = "Bóng đổ",
            [Effects] = "Hiệu ứng",
            [Other] = "Screentone",
            [Cleanup] = "Nét sạch",
            [Lineart] = "Lineart",
            [SpeechBubble] = "Sửa hội thoại",
        };

    private static readonly Regex SlugRegex = new(
        @"^[a-z][a-z0-9_]{1,38}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static bool IsValid(string? taskType) =>
        !string.IsNullOrWhiteSpace(taskType) && All.Contains(taskType.Trim());

    public static bool IsValidSlug(string? taskType) =>
        !string.IsNullOrWhiteSpace(taskType) && SlugRegex.IsMatch(taskType.Trim().ToLowerInvariant());

    public static string NormalizeSlug(string taskType)
    {
        if (string.IsNullOrWhiteSpace(taskType))
        {
            throw new ArgumentException("TaskType is required.");
        }

        var normalized = taskType.Trim().ToLowerInvariant().Replace(' ', '_').Replace('-', '_');
        if (!IsValidSlug(normalized))
        {
            throw new ArgumentException(
                "Mã loại task không hợp lệ. Dùng chữ thường, số, gạch dưới; bắt đầu bằng chữ (vd: coloring, clean_line).");
        }

        return normalized;
    }

    public static string GetDefaultDisplayName(string taskType)
    {
        var key = taskType.Trim().ToLowerInvariant();
        return DefaultDisplayNames.TryGetValue(key, out var name)
            ? name
            : key.Replace('_', ' ');
    }
}
