using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Favorite
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public Guid? SeriesId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Series? Series { get; set; }

    public virtual Profile? User { get; set; }
}
