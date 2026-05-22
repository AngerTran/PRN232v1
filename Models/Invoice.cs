using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Invoice
{
    public Guid Id { get; set; }

    public Guid? OrgId { get; set; }

    public decimal Amount { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Organization? Org { get; set; }
}
