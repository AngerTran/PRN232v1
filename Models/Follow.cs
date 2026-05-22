using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Follow
{
    public Guid Id { get; set; }

    public Guid? FollowerId { get; set; }

    public Guid? FollowedId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Profile? Followed { get; set; }

    public virtual Profile? Follower { get; set; }
}
