using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Plan
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public decimal MonthlyPrice { get; set; }

    public int MaxSeries { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Organization> Organizations { get; set; } = new List<Organization>();

    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
