using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Wallet
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public decimal? Balance { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? User { get; set; }
}
