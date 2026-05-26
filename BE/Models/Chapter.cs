using System;
using System.Collections.Generic;

namespace PRN232v1.Models;

public partial class Chapter
{
    public Guid Id { get; set; }

    public Guid SeriesId { get; set; }

    public int ChapterNumber { get; set; }

    public string? Title { get; set; }

    public string? ManuscriptUrl { get; set; }

    public DateTime? Deadline { get; set; }

    public DateTime? ReleaseDate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<Page> Pages { get; set; } = new List<Page>();

    public virtual Series Series { get; set; } = null!;
}
