using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Annotation
{
    public Guid Id { get; set; }

    public Guid? PageId { get; set; }

    public Guid? AuthorId { get; set; }

    public string PointData { get; set; } = null!;

    public string Content { get; set; } = null!;

    public bool? IsResolved { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? Author { get; set; }

    public virtual Page? Page { get; set; }
}
