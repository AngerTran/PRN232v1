using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class EditorialVote
{
    public Guid Id { get; set; }

    public Guid? BoardMemberId { get; set; }

    public Guid? ManuscriptId { get; set; }

    public Guid? SeriesId { get; set; }

    public string VoteType { get; set; } = null!;

    public string Decision { get; set; } = null!;

    public string? Comment { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? BoardMember { get; set; }

    public virtual Manuscript? Manuscript { get; set; }

    public virtual Series? Series { get; set; }
}
