using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class EditorTask
{
    public Guid Id { get; set; }

    public Guid PageId { get; set; }

    public Guid? AssignedTo { get; set; }

    public Guid? AssignedBy { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public string TaskType { get; set; } = null!;

    public string Region { get; set; } = null!;

    public string Status { get; set; } = TaskStatuses.Todo;

    public int? Priority { get; set; }

    public DateTime? Deadline { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    // URL các file tham khảo do mangaka/editor đính kèm khi giao task.
    public List<string> ResourceUrls { get; set; } = new();

    public virtual Profile? AssignedByNavigation { get; set; }

    public virtual Profile? AssignedToNavigation { get; set; }

    public virtual Page Page { get; set; } = null!;

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
