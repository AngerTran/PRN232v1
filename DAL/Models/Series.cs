using System;
using System.Collections.Generic;
using DAL.Common;

namespace DAL.Models;

public partial class Series
{
    public Guid Id { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string? Genre { get; set; }

    public string? TargetAudience { get; set; }

    public string? CoverImageUrl { get; set; }

    public Guid AuthorId { get; set; }

    public Guid? EditorId { get; set; }

    public SeriesStatus Status { get; set; } = SeriesStatus.Draft;

    public PublishingFrequency? PublishingFrequency { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? SubmittedForReviewAt { get; set; }

    public string? EditorDefenseNote { get; set; }

    public DateTime? EditorDefenseNoteUpdatedAt { get; set; }

    public virtual Profile Author { get; set; } = null!;

    public virtual ICollection<BoardVote> BoardVotes { get; set; } = new List<BoardVote>();

    public virtual ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();

    public virtual Profile? Editor { get; set; }

    public virtual ICollection<PublishingSchedule> PublishingSchedules { get; set; } = new List<PublishingSchedule>();

    public virtual ICollection<Ranking> Rankings { get; set; } = new List<Ranking>();
}
