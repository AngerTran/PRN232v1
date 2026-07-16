using DAL.Common;

namespace DAL.Models;

public partial class SeriesTaskPriceProposalItem
{
    public Guid Id { get; set; }

    public Guid ProposalId { get; set; }

    public string TaskType { get; set; } = TaskTypes.Other;

    public decimal ProposedPrice { get; set; }

    public virtual SeriesTaskPriceProposal Proposal { get; set; } = null!;
}
