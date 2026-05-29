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

    public static bool IsValid(string? taskType) =>
        !string.IsNullOrWhiteSpace(taskType) && All.Contains(taskType.Trim());
}
