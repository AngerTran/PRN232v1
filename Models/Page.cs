using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Page
{
    public Guid Id { get; set; }

    public Guid? ChapterId { get; set; }

    public int PageNumber { get; set; }

    public string? ImageUrl { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();

    public virtual Chapter? Chapter { get; set; }

    public virtual ICollection<EditorTask> Tasks { get; set; } = new List<EditorTask>();
}
