using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class EditorTask
{
    public Guid Id { get; set; }

    public Guid? PageId { get; set; }

    public Guid? AssigneeId { get; set; }

    public Guid? CreatorId { get; set; }

    public string RegionData { get; set; } = null!;

    public string? TaskType { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? Assignee { get; set; }

    public virtual Profile? Creator { get; set; }

    public virtual Page? Page { get; set; }

    public virtual ICollection<TaskSubmission> TaskSubmissions { get; set; } = new List<TaskSubmission>();
}
