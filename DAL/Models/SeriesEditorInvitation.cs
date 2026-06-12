namespace DAL.Models;

public class SeriesEditorInvitation
{
    public Guid SeriesId { get; set; }

    public Guid EditorId { get; set; }

    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public virtual Series Series { get; set; } = null!;

    public virtual Profile Editor { get; set; } = null!;
}
