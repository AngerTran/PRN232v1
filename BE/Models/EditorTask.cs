using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class EditorTask
{
    public Guid Id { get; set; }

    public Guid PageId { get; set; }

    public Guid? AssignedTo { get; set; }

    public Guid? AssignedBy { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public string Region { get; set; } = null!;

    public int? Priority { get; set; }

    public DateTime? Deadline { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Profile? AssignedByNavigation { get; set; }

    public virtual Profile? AssignedToNavigation { get; set; }

    public virtual Page Page { get; set; } = null!;

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
