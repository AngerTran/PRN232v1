using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class Profile
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public ProfileRole Role { get; set; } = ProfileRole.Assistant;

    public string? AvatarUrl { get; set; }

    public string? Bio { get; set; }

    public bool EmailConfirmed { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();

    public virtual ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();

    public virtual ICollection<BoardVote> BoardVotes { get; set; } = new List<BoardVote>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Series> SeriesAuthors { get; set; } = new List<Series>();

    public virtual ICollection<Series> SeriesEditors { get; set; } = new List<Series>();

    public virtual ICollection<Submission> SubmissionAssistants { get; set; } = new List<Submission>();

    public virtual ICollection<Submission> SubmissionReviewedByNavigations { get; set; } = new List<Submission>();

    public virtual ICollection<EditorTask> TaskAssignedByNavigations { get; set; } = new List<EditorTask>();

    public virtual ICollection<EditorTask> TaskAssignedToNavigations { get; set; } = new List<EditorTask>();
}
