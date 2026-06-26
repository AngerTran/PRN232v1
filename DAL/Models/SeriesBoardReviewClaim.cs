namespace DAL.Models;

public class SeriesBoardReviewClaim
{
    public Guid SeriesId { get; set; }

    public Guid BoardMemberId { get; set; }

    /// <summary>public = tự nhận từ tab chung; invitation = qua lời mời mangaka.</summary>
    public string Source { get; set; } = "public";

    public DateTime ClaimedAt { get; set; }

    public bool IsLead { get; set; }

    public virtual Series Series { get; set; } = null!;

    public virtual Profile BoardMember { get; set; } = null!;
}
