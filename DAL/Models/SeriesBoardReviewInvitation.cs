namespace DAL.Models;

public class SeriesBoardReviewInvitation
{
    public Guid SeriesId { get; set; }

    public Guid BoardMemberId { get; set; }

    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public virtual Series Series { get; set; } = null!;

    public virtual Profile BoardMember { get; set; } = null!;
}
