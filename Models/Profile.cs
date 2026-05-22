using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Profile
{
    public Guid Id { get; set; }

    public Guid? OrgId { get; set; }

    public string? FullName { get; set; }

    public string Role { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public bool? EmailNotifEnabled { get; set; }

    public bool? PushNotifEnabled { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public virtual ICollection<Donation> DonationReceivers { get; set; } = new List<Donation>();

    public virtual ICollection<Donation> DonationSenders { get; set; } = new List<Donation>();

    public virtual ICollection<EditorialVote> EditorialVotes { get; set; } = new List<EditorialVote>();

    public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();

    public virtual ICollection<Follow> FollowFolloweds { get; set; } = new List<Follow>();

    public virtual ICollection<Follow> FollowFollowers { get; set; } = new List<Follow>();

    public virtual ICollection<Manuscript> Manuscripts { get; set; } = new List<Manuscript>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual Organization? Org { get; set; }

    public virtual ICollection<OrganizationMember> OrganizationMembers { get; set; } = new List<OrganizationMember>();

    public virtual ICollection<PayoutRequest> PayoutRequests { get; set; } = new List<PayoutRequest>();

    public virtual ICollection<ReaderVotingCycle> ReaderVotingCycles { get; set; } = new List<ReaderVotingCycle>();

    public virtual ICollection<EditorTask> TaskAssignees { get; set; } = new List<EditorTask>();

    public virtual ICollection<EditorTask> TaskCreators { get; set; } = new List<EditorTask>();

    public virtual Wallet? Wallet { get; set; }
}
