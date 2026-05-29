using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class Submission
{
    public Guid Id { get; set; }

    public Guid TaskId { get; set; }

    public Guid? AssistantId { get; set; }

    public int? VersionNumber { get; set; }

    public string FileUrl { get; set; } = null!;

    public string? PreviewImageUrl { get; set; }

    public string? Note { get; set; }

    public string Status { get; set; } = TaskStatuses.Submitted;

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public virtual Profile? Assistant { get; set; }

    public virtual Profile? ReviewedByNavigation { get; set; }

    public virtual EditorTask Task { get; set; } = null!;
}
