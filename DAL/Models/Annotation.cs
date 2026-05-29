using System;
using System.Collections.Generic;

namespace DAL.Models;

public partial class Annotation
{
    public Guid Id { get; set; }

    public Guid PageId { get; set; }

    public Guid? CreatedBy { get; set; }

    public string? AnnotationType { get; set; }

    public string Shape { get; set; } = null!;

    public string? Content { get; set; }

    public string? Color { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Profile? CreatedByNavigation { get; set; }

    public virtual Page Page { get; set; } = null!;
}
