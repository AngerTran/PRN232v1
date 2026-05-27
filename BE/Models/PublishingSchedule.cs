using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class PublishingSchedule
{
    public Guid Id { get; set; }

    public Guid? SeriesId { get; set; }

    public DateOnly PublishDate { get; set; }

    public string Frequency { get; set; } = null!;

    public int? IssueNumber { get; set; }

    public string? Notes { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Series? Series { get; set; }
}
