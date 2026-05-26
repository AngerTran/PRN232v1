using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Notification
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public string? Title { get; set; }

    public string? Message { get; set; }

    public bool? IsRead { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? User { get; set; }
}
