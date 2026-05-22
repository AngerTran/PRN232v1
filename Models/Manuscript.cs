using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Manuscript
{
    public Guid Id { get; set; }

    public Guid? OrgId { get; set; }

    public Guid? AuthorId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string FileUrl { get; set; } = null!;

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? Author { get; set; }

    public virtual ICollection<EditorialVote> EditorialVotes { get; set; } = new List<EditorialVote>();

    public virtual Organization? Org { get; set; }
}
