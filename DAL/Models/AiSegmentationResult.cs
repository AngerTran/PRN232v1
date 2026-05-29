using System;
using System.Collections.Generic;

namespace DAL.Models;

public partial class AiSegmentationResult
{
    public Guid Id { get; set; }

    public Guid? PageId { get; set; }

    public string? ModelName { get; set; }

    public string? RegionType { get; set; }

    public decimal? ConfidenceScore { get; set; }

    public string? SegmentationData { get; set; }

    public int? InferenceTimeMs { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Page? Page { get; set; }
}
