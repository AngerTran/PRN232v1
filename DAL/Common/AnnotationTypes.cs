namespace DAL.Common;
public static class AnnotationTypes
{
    public const string Content = "content";
    public const string Dialogue = "dialogue";
    public const string Warning = "warning";
    public const string Correction = "correction";
    public const string Approval = "approval";
    public const string Script = "script";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Content, Dialogue, Warning, Correction, Approval, Script
    };

    public static bool IsValid(string? type) =>
        !string.IsNullOrWhiteSpace(type) && All.Contains(type.Trim());
}
