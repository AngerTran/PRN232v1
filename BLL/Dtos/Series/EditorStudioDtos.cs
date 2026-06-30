namespace BLL.Dtos.Series;

public record EditorChapterProgressItem(
    Guid Id,
    int ChapterNumber,
    string Title,
    string Status,
    DateTime? Deadline,
    int ProgressPercent,
    int PageCount,
    int CompletedPages,
    int PendingTasks,
    int ActiveTasks,
    int DoneTasks,
    bool IsOverdue);

public record EditorStudioProgressResponse(
    Guid SeriesId,
    string Title,
    string Status,
    int ChapterCount,
    int TotalPages,
    int CompletedPages,
    int TotalTasks,
    int CompletedTasks,
    int OverdueChapters,
    int OverallProgressPercent,
    IReadOnlyList<EditorChapterProgressItem> Chapters);

public record UpdateEditorDefenseNoteRequest(
    string? Note);

public record EditorDefenseNoteResponse(
    Guid SeriesId,
    string? Note,
    DateTime? UpdatedAt);
