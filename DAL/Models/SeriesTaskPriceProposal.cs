using DAL.Common;

namespace DAL.Models;

public partial class SeriesTaskPriceProposal
{
    public Guid Id { get; set; }

    public Guid SeriesId { get; set; }

    public Guid ProposedBy { get; set; }

    public string Status { get; set; } = TaskPriceProposalStatuses.Pending;

    public string? Note { get; set; }

    public string? AdminReason { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Series Series { get; set; } = null!;

    public virtual Profile ProposedByNavigation { get; set; } = null!;

    public virtual Profile? ReviewedByNavigation { get; set; }

    public virtual ICollection<SeriesTaskPriceProposalItem> Items { get; set; } = new List<SeriesTaskPriceProposalItem>();
}
