using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Organization
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public Guid OwnerId { get; set; }

    public Guid? PlanId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    public virtual ICollection<Manuscript> Manuscripts { get; set; } = new List<Manuscript>();

    public virtual ICollection<OrganizationMember> OrganizationMembers { get; set; } = new List<OrganizationMember>();

    public virtual Plan? Plan { get; set; }

    public virtual ICollection<Profile> Profiles { get; set; } = new List<Profile>();

    public virtual ICollection<Series> Series { get; set; } = new List<Series>();

    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
