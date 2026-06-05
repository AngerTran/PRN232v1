using NpgsqlTypes;

namespace DAL.Common;

// CLR enum ánh xạ tới Postgres enum `task_status`.
// Dùng cho Npgsql/EF để ghi đúng kiểu enum (thay vì text) ở cột tasks.status / submissions.status.
public enum TaskStatusDb
{
    [PgName("todo")]
    Todo,

    [PgName("in_progress")]
    InProgress,

    [PgName("submitted")]
    Submitted,

    [PgName("approved")]
    Approved,

    [PgName("rejected")]
    Rejected
}

// CLR enum ánh xạ tới Postgres enum `task_type` (cột tasks.task_type).
public enum TaskTypeDb
{
    [PgName("background")]
    Background,

    [PgName("shading")]
    Shading,

    [PgName("cleanup")]
    Cleanup,

    [PgName("speech_bubble")]
    SpeechBubble,

    [PgName("effects")]
    Effects,

    [PgName("lineart")]
    Lineart,

    [PgName("other")]
    Other
}

public static class TaskEnumConversions
{
    public static TaskStatusDb StatusFromString(string? value) => value?.Trim() switch
    {
        TaskStatuses.Todo => TaskStatusDb.Todo,
        TaskStatuses.InProgress => TaskStatusDb.InProgress,
        TaskStatuses.Submitted => TaskStatusDb.Submitted,
        TaskStatuses.Approved => TaskStatusDb.Approved,
        TaskStatuses.Rejected => TaskStatusDb.Rejected,
        _ => TaskStatusDb.Todo
    };

    public static string StatusToString(TaskStatusDb value) => value switch
    {
        TaskStatusDb.Todo => TaskStatuses.Todo,
        TaskStatusDb.InProgress => TaskStatuses.InProgress,
        TaskStatusDb.Submitted => TaskStatuses.Submitted,
        TaskStatusDb.Approved => TaskStatuses.Approved,
        TaskStatusDb.Rejected => TaskStatuses.Rejected,
        _ => TaskStatuses.Todo
    };

    public static TaskTypeDb TypeFromString(string? value) => value?.Trim() switch
    {
        TaskTypes.Background => TaskTypeDb.Background,
        TaskTypes.Shading => TaskTypeDb.Shading,
        TaskTypes.Cleanup => TaskTypeDb.Cleanup,
        TaskTypes.SpeechBubble => TaskTypeDb.SpeechBubble,
        TaskTypes.Effects => TaskTypeDb.Effects,
        TaskTypes.Lineart => TaskTypeDb.Lineart,
        _ => TaskTypeDb.Other
    };

    public static string TypeToString(TaskTypeDb value) => value switch
    {
        TaskTypeDb.Background => TaskTypes.Background,
        TaskTypeDb.Shading => TaskTypes.Shading,
        TaskTypeDb.Cleanup => TaskTypes.Cleanup,
        TaskTypeDb.SpeechBubble => TaskTypes.SpeechBubble,
        TaskTypeDb.Effects => TaskTypes.Effects,
        TaskTypeDb.Lineart => TaskTypes.Lineart,
        _ => TaskTypes.Other
    };
}
