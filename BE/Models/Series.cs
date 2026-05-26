using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Series
{
    public Guid Id { get; set; }

    public Guid? OrgId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string? CoverUrl { get; set; }

    public List<string>? Tags { get; set; }

    public string? Status { get; set; }

    public bool? IsPublic { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();

    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public virtual ICollection<Donation> Donations { get; set; } = new List<Donation>();

    public virtual ICollection<EditorialVote> EditorialVotes { get; set; } = new List<EditorialVote>();

    public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();

    public virtual Organization? Org { get; set; }

    public virtual ICollection<ReaderVotingCycle> ReaderVotingCycles { get; set; } = new List<ReaderVotingCycle>();
}
