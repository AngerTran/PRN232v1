using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class TaskSubmission
{
    public Guid Id { get; set; }

    public Guid? TaskId { get; set; }

    public string FileUrl { get; set; } = null!;

    public int? Version { get; set; }

    public string? Comment { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual EditorTask? EditorTask { get; set; }
}
