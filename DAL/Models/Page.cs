using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class Page
{
    public Guid Id { get; set; }

    public Guid ChapterId { get; set; }

    public int PageNumber { get; set; }

    public string? ImageUrl { get; set; }

    public string? ThumbnailUrl { get; set; }

    public PageStatus Status { get; set; } = PageStatus.Draft;

    public int? Width { get; set; }

    public int? Height { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AiSegmentationResult> AiSegmentationResults { get; set; } = new List<AiSegmentationResult>();

    public virtual ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();

    public virtual Chapter Chapter { get; set; } = null!;

    public virtual ICollection<EditorTask> Tasks { get; set; } = new List<EditorTask>();
}
