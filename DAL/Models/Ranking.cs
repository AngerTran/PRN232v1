using System;
using System.Collections.Generic;

namespace DAL.Models;

public partial class Ranking
{
    public Guid Id { get; set; }

    public Guid SeriesId { get; set; }

    public int IssueNumber { get; set; }

    public int RankPosition { get; set; }

    public int? VoteCount { get; set; }

    public decimal? PopularityScore { get; set; }

    public string? Notes { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Series Series { get; set; } = null!;
}
