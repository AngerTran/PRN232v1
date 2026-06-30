using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class BoardVote
{
    public Guid Id { get; set; }

    public Guid? SeriesId { get; set; }

    public Guid? BoardMemberId { get; set; }

    public string Decision { get; set; } = null!;

    public string? Comment { get; set; }

    public PublishingFrequency? PublishingFrequency { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? BoardMember { get; set; }

    public virtual Series? Series { get; set; }
}
