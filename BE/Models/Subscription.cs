using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Subscription
{
    public Guid Id { get; set; }

    public Guid? OrgId { get; set; }

    public Guid? PlanId { get; set; }

    public DateTime EndDate { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Organization? Org { get; set; }

    public virtual Plan? Plan { get; set; }
}
