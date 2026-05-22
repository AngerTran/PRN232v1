using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Donation
{
    public Guid Id { get; set; }

    public Guid? SenderId { get; set; }

    public Guid? ReceiverId { get; set; }

    public Guid? SeriesId { get; set; }

    public decimal Amount { get; set; }

    public string? Message { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? Receiver { get; set; }

    public virtual Profile? Sender { get; set; }

    public virtual Series? Series { get; set; }
}
