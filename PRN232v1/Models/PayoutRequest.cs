using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class PayoutRequest
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public decimal Amount { get; set; }

    public string BankInfo { get; set; } = null!;

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? User { get; set; }
}
