using DAL.Common;

namespace DAL.Models;

public partial class SeriesTaskPrice
{
    public Guid Id { get; set; }

    public Guid SeriesId { get; set; }

    public string TaskType { get; set; } = TaskTypes.Other;

    public decimal OfficialPrice { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public Guid? ApprovedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Series Series { get; set; } = null!;

    public virtual Profile? ApprovedByNavigation { get; set; }
}
