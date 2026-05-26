using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class ActivityLog
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public string? Action { get; set; }

    public string? EntityType { get; set; }

    public Guid? EntityId { get; set; }

    public string? OldData { get; set; }

    public string? NewData { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? User { get; set; }
}
