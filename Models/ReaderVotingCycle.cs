using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class ReaderVotingCycle
{
    public Guid Id { get; set; }

    public Guid? SeriesId { get; set; }

    public string CycleCode { get; set; } = null!;

    public int VoteCount { get; set; }

    public double RankScore { get; set; }

    public Guid? RecordedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? RecordedByNavigation { get; set; }

    public virtual Series? Series { get; set; }
}
