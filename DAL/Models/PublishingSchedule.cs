using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class PublishingSchedule
{
    public Guid Id { get; set; }

    public Guid? SeriesId { get; set; }

    public Guid? ChapterId { get; set; }

    public DateOnly PublishDate { get; set; }

    public PublishingFrequency Frequency { get; set; }

    public int? IssueNumber { get; set; }

    public string? Notes { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Series? Series { get; set; }

    public virtual Chapter? Chapter { get; set; }
}
