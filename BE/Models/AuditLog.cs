using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class AuditLog
{
    public Guid Id { get; set; }

    public Guid? OrgId { get; set; }

    public Guid? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string? Payload { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Organization? Org { get; set; }

    public virtual Profile? User { get; set; }
}
