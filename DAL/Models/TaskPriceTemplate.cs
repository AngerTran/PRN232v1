using DAL.Common;

namespace DAL.Models;

public partial class TaskPriceTemplate
{
    public Guid Id { get; set; }

    public string TaskType { get; set; } = TaskTypes.Other;

    /// <summary>Nhãn hiển thị (VD: Nền, Lineart). Admin có thể đổi.</summary>
    public string DisplayName { get; set; } = string.Empty;

    public decimal DefaultPrice { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
