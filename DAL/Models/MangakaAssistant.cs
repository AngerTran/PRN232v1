namespace DAL.Models;

public class MangakaAssistant
{
    public Guid MangakaId { get; set; }

    public Guid AssistantId { get; set; }

    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public virtual Profile Mangaka { get; set; } = null!;

    public virtual Profile Assistant { get; set; } = null!;
}
