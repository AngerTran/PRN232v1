using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Comment
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public Guid? SeriesId { get; set; }

    public string Content { get; set; } = null!;

    public Guid? ParentId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Comment> InverseParent { get; set; } = new List<Comment>();

    public virtual Comment? Parent { get; set; }

    public virtual Series? Series { get; set; }

    public virtual Profile? User { get; set; }
}
