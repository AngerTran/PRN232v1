using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using DAL.Common;
using DAL.Models;

namespace DAL.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActivityLog> ActivityLogs { get; set; }

    public virtual DbSet<AiSegmentationResult> AiSegmentationResults { get; set; }

    public virtual DbSet<Annotation> Annotations { get; set; }

    public virtual DbSet<BoardVote> BoardVotes { get; set; }

    public virtual DbSet<Chapter> Chapters { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<MangakaAssistant> MangakaAssistants { get; set; }

    public virtual DbSet<SeriesEditorInvitation> SeriesEditorInvitations { get; set; }

    public virtual DbSet<SeriesBoardReviewInvitation> SeriesBoardReviewInvitations { get; set; }

    public virtual DbSet<SeriesBoardReviewClaim> SeriesBoardReviewClaims { get; set; }

    public virtual DbSet<Page> Pages { get; set; }

    public virtual DbSet<Profile> Profiles { get; set; }

    public virtual DbSet<PublishingSchedule> PublishingSchedules { get; set; }

    public virtual DbSet<Ranking> Rankings { get; set; }

    public virtual DbSet<Series> Series { get; set; }

    public virtual DbSet<Submission> Submissions { get; set; }

    public virtual DbSet<EditorTask> Tasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("annotation_type", new[] { "content", "dialogue", "warning", "correction", "approval" })
            .HasPostgresEnum("auth", "aal_level", new[] { "aal1", "aal2", "aal3" })
            .HasPostgresEnum("auth", "code_challenge_method", new[] { "s256", "plain" })
            .HasPostgresEnum("auth", "factor_status", new[] { "unverified", "verified" })
            .HasPostgresEnum("auth", "factor_type", new[] { "totp", "webauthn", "phone" })
            .HasPostgresEnum("auth", "oauth_authorization_status", new[] { "pending", "approved", "denied", "expired" })
            .HasPostgresEnum("auth", "oauth_client_type", new[] { "public", "confidential" })
            .HasPostgresEnum("auth", "oauth_registration_type", new[] { "dynamic", "manual" })
            .HasPostgresEnum("auth", "oauth_response_type", new[] { "code" })
            .HasPostgresEnum("auth", "one_time_token_type", new[] { "confirmation_token", "reauthentication_token", "recovery_token", "email_change_token_new", "email_change_token_current", "phone_change_token" })
            .HasPostgresEnum<ChapterStatus>(name: "chapter_status")
            .HasPostgresEnum("notification_type", new[] { "task_assigned", "submission_received", "submission_approved", "submission_rejected", "annotation_added", "deadline_warning", "ranking_warning", "board_vote" })
            .HasPostgresEnum<PageStatus>(name: "page_status")
            .HasPostgresEnum<PublishingFrequency>(name: "publishing_frequency")
            .HasPostgresEnum("realtime", "action", new[] { "INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR" })
            .HasPostgresEnum("realtime", "equality_op", new[] { "eq", "neq", "lt", "lte", "gt", "gte", "in" })
            .HasPostgresEnum<SeriesStatus>(name: "series_status")
            .HasPostgresEnum("storage", "buckettype", new[] { "STANDARD", "ANALYTICS", "VECTOR" })
            .HasPostgresEnum<TaskStatusDb>(name: "task_status")
            .HasPostgresEnum<TaskTypeDb>(name: "task_type")
            .HasPostgresEnum<ProfileRole>(name: "user_role")
            .HasPostgresEnum<VoteDecisionDb>(name: "vote_decision")
            .HasPostgresExtension("extensions", "pg_stat_statements")
            .HasPostgresExtension("extensions", "pgcrypto")
            .HasPostgresExtension("extensions", "uuid-ossp")
            .HasPostgresExtension("vault", "supabase_vault");

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("activity_logs_pkey");

            entity.ToTable("activity_logs");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.Action)
                .HasMaxLength(100)
                .HasColumnName("action");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.EntityType)
                .HasMaxLength(100)
                .HasColumnName("entity_type");
            entity.Property(e => e.NewData)
                .HasColumnType("jsonb")
                .HasColumnName("new_data");
            entity.Property(e => e.OldData)
                .HasColumnType("jsonb")
                .HasColumnName("old_data");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.ActivityLogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("activity_logs_user_id_fkey");
        });

        modelBuilder.Entity<AiSegmentationResult>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ai_segmentation_results_pkey");

            entity.ToTable("ai_segmentation_results");

            entity.HasIndex(e => e.SegmentationData, "idx_ai_segmentation_gin").HasMethod("gin");

            entity.HasIndex(e => e.PageId, "idx_ai_segmentation_page");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.ConfidenceScore)
                .HasPrecision(5, 2)
                .HasColumnName("confidence_score");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.InferenceTimeMs).HasColumnName("inference_time_ms");
            entity.Property(e => e.ModelName)
                .HasMaxLength(100)
                .HasColumnName("model_name");
            entity.Property(e => e.PageId).HasColumnName("page_id");
            entity.Property(e => e.RegionType)
                .HasMaxLength(50)
                .HasColumnName("region_type");
            entity.Property(e => e.SegmentationData)
                .HasColumnType("jsonb")
                .HasColumnName("segmentation_data");

            entity.HasOne(d => d.Page).WithMany(p => p.AiSegmentationResults)
                .HasForeignKey(d => d.PageId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("ai_segmentation_results_page_id_fkey");
        });

        modelBuilder.Entity<Annotation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("annotations_pkey");

            entity.ToTable("annotations");

            entity.HasIndex(e => e.PageId, "idx_annotations_page");

            entity.HasIndex(e => e.Shape, "idx_annotations_shape_gin").HasMethod("gin");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.Color)
                .HasMaxLength(20)
                .HasColumnName("color");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.AnnotationType)
                .HasColumnType("annotation_type")
                .HasColumnName("annotation_type");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.PageId).HasColumnName("page_id");
            entity.Property(e => e.Shape)
                .HasColumnType("jsonb")
                .HasColumnName("shape");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Annotations)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("annotations_created_by_fkey");

            entity.HasOne(d => d.Page).WithMany(p => p.Annotations)
                .HasForeignKey(d => d.PageId)
                .HasConstraintName("annotations_page_id_fkey");
        });

        modelBuilder.Entity<BoardVote>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("board_votes_pkey");

            entity.ToTable("board_votes");

            entity.HasIndex(e => new { e.SeriesId, e.BoardMemberId }, "board_votes_series_id_board_member_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.BoardMemberId).HasColumnName("board_member_id");
            entity.Property(e => e.Comment).HasColumnName("comment");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Decision)
                .HasConversion(
                    v => VoteEnumConversions.DecisionFromString(v),
                    v => VoteEnumConversions.DecisionToString(v))
                .HasColumnName("decision");
            entity.Property(e => e.PublishingFrequency)
                .HasColumnName("publishing_frequency")
                .HasColumnType("publishing_frequency");
            entity.Property(e => e.SeriesId).HasColumnName("series_id");

            entity.HasOne(d => d.BoardMember).WithMany(p => p.BoardVotes)
                .HasForeignKey(d => d.BoardMemberId)
                .HasConstraintName("board_votes_board_member_id_fkey");

            entity.HasOne(d => d.Series).WithMany(p => p.BoardVotes)
                .HasForeignKey(d => d.SeriesId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("board_votes_series_id_fkey");
        });

        modelBuilder.Entity<Chapter>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("chapters_pkey");

            entity.ToTable("chapters");

            entity.HasIndex(e => new { e.SeriesId, e.ChapterNumber }, "chapters_series_id_chapter_number_key").IsUnique();

            entity.HasIndex(e => e.SeriesId, "idx_chapters_series");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.ChapterNumber).HasColumnName("chapter_number");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Deadline).HasColumnName("deadline");
            entity.Property(e => e.ManuscriptUrl).HasColumnName("manuscript_url");
            entity.Property(e => e.ReleaseDate).HasColumnName("release_date");
            entity.Property(e => e.Status)
                .HasColumnType("chapter_status")
                .HasDefaultValueSql("'draft'::chapter_status")
                .HasColumnName("status");
            entity.Property(e => e.SeriesId).HasColumnName("series_id");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Series).WithMany(p => p.Chapters)
                .HasForeignKey(d => d.SeriesId)
                .HasConstraintName("chapters_series_id_fkey");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("notifications_pkey");

            entity.ToTable("notifications");

            entity.HasIndex(e => e.UserId, "idx_notifications_user");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasColumnName("is_read");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.LinkUrl)
                .HasMaxLength(500)
                .HasColumnName("link_url");
            entity.Property(e => e.Category)
                .HasMaxLength(50)
                .HasColumnName("category");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("notifications_user_id_fkey");
        });

        modelBuilder.Entity<MangakaAssistant>(entity =>
        {
            entity.HasKey(e => new { e.MangakaId, e.AssistantId })
                .HasName("mangaka_assistants_pkey");

            entity.ToTable("mangaka_assistants");

            entity.HasIndex(e => e.AssistantId, "idx_mangaka_assistants_assistant");

            entity.Property(e => e.MangakaId).HasColumnName("mangaka_id");
            entity.Property(e => e.AssistantId).HasColumnName("assistant_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("pending")
                .HasColumnName("status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.RespondedAt).HasColumnName("responded_at");

            entity.HasOne(d => d.Mangaka).WithMany(p => p.MangakaAssistants)
                .HasForeignKey(d => d.MangakaId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("mangaka_assistants_mangaka_id_fkey");

            entity.HasOne(d => d.Assistant).WithMany(p => p.AssistantMangakas)
                .HasForeignKey(d => d.AssistantId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("mangaka_assistants_assistant_id_fkey");
        });

        modelBuilder.Entity<SeriesEditorInvitation>(entity =>
        {
            entity.HasKey(e => new { e.SeriesId, e.EditorId })
                .HasName("series_editor_invitations_pkey");

            entity.ToTable("series_editor_invitations");

            entity.HasIndex(e => e.EditorId, "idx_series_editor_invitations_editor");

            entity.Property(e => e.SeriesId).HasColumnName("series_id");
            entity.Property(e => e.EditorId).HasColumnName("editor_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("pending")
                .HasColumnName("status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.RespondedAt).HasColumnName("responded_at");

            entity.HasOne(d => d.Series).WithMany()
                .HasForeignKey(d => d.SeriesId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("series_editor_invitations_series_id_fkey");

            entity.HasOne(d => d.Editor).WithMany()
                .HasForeignKey(d => d.EditorId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("series_editor_invitations_editor_id_fkey");
        });

        modelBuilder.Entity<SeriesBoardReviewInvitation>(entity =>
        {
            entity.HasKey(e => new { e.SeriesId, e.BoardMemberId })
                .HasName("series_board_review_invitations_pkey");

            entity.ToTable("series_board_review_invitations");

            entity.HasIndex(e => e.BoardMemberId, "idx_series_board_review_invitations_board");

            entity.Property(e => e.SeriesId).HasColumnName("series_id");
            entity.Property(e => e.BoardMemberId).HasColumnName("board_member_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("pending")
                .HasColumnName("status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.RespondedAt).HasColumnName("responded_at");

            entity.HasOne(d => d.Series).WithMany()
                .HasForeignKey(d => d.SeriesId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("series_board_review_invitations_series_id_fkey");

            entity.HasOne(d => d.BoardMember).WithMany()
                .HasForeignKey(d => d.BoardMemberId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("series_board_review_invitations_board_member_id_fkey");
        });

        modelBuilder.Entity<SeriesBoardReviewClaim>(entity =>
        {
            entity.HasKey(e => new { e.SeriesId, e.BoardMemberId })
                .HasName("series_board_review_claims_pkey");

            entity.ToTable("series_board_review_claims");

            entity.HasIndex(e => e.BoardMemberId, "idx_series_board_review_claims_board");

            entity.Property(e => e.SeriesId).HasColumnName("series_id");
            entity.Property(e => e.BoardMemberId).HasColumnName("board_member_id");
            entity.Property(e => e.Source)
                .HasMaxLength(20)
                .HasDefaultValue("public")
                .HasColumnName("source");
            entity.Property(e => e.ClaimedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("claimed_at");
            entity.Property(e => e.IsLead)
                .HasDefaultValue(false)
                .HasColumnName("is_lead");

            entity.HasIndex(e => e.SeriesId, "idx_series_board_review_claims_one_lead")
                .IsUnique()
                .HasFilter("is_lead = true");

            entity.HasOne(d => d.Series).WithMany()
                .HasForeignKey(d => d.SeriesId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("series_board_review_claims_series_id_fkey");

            entity.HasOne(d => d.BoardMember).WithMany()
                .HasForeignKey(d => d.BoardMemberId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("series_board_review_claims_board_member_id_fkey");
        });

        modelBuilder.Entity<Page>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("pages_pkey");

            entity.ToTable("pages");

            entity.HasIndex(e => e.ChapterId, "idx_pages_chapter");

            entity.HasIndex(e => new { e.ChapterId, e.PageNumber }, "pages_chapter_id_page_number_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.ChapterId).HasColumnName("chapter_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Height).HasColumnName("height");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.PageNumber).HasColumnName("page_number");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("page_status")
                .HasDefaultValueSql("'draft'::page_status")
                .IsRequired();
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.Width).HasColumnName("width");

            entity.HasOne(d => d.Chapter).WithMany(p => p.Pages)
                .HasForeignKey(d => d.ChapterId)
                .HasConstraintName("pages_chapter_id_fkey");
        });

        modelBuilder.Entity<Profile>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("profiles_pkey");

            entity.ToTable("profiles");

            entity.HasIndex(e => e.Email, "profiles_email_key").IsUnique();

            entity.Property(e => e.Id)
                .ValueGeneratedNever()
                .HasColumnName("id");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.Bio).HasColumnName("bio");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.EmailConfirmed)
                .HasDefaultValue(false)
                .HasColumnName("email_confirmed");
            entity.Property(e => e.FullName)
                .HasMaxLength(255)
                .HasColumnName("full_name");
            entity.Property(e => e.Role)
                .HasColumnName("role")
                .HasColumnType("user_role")
                .IsRequired();
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.IsBoardLead)
                .HasDefaultValue(false)
                .HasColumnName("is_board_lead");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<PublishingSchedule>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("publishing_schedules_pkey");

            entity.ToTable("publishing_schedules");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IssueNumber).HasColumnName("issue_number");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PublishDate).HasColumnName("publish_date");
            entity.Property(e => e.Frequency)
                .HasColumnType("publishing_frequency")
                .HasColumnName("frequency");
            entity.Property(e => e.SeriesId).HasColumnName("series_id");

            entity.HasOne(d => d.Series).WithMany(p => p.PublishingSchedules)
                .HasForeignKey(d => d.SeriesId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("publishing_schedules_series_id_fkey");
        });

        modelBuilder.Entity<Ranking>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("rankings_pkey");

            entity.ToTable("rankings");

            entity.HasIndex(e => e.SeriesId, "idx_rankings_series");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IssueNumber).HasColumnName("issue_number");
            entity.Property(e => e.PopularityScore)
                .HasPrecision(10, 2)
                .HasDefaultValue(0m)
                .HasColumnName("popularity_score");
            entity.Property(e => e.RankPosition).HasColumnName("rank_position");
            entity.Property(e => e.SeriesId).HasColumnName("series_id");
            entity.Property(e => e.VoteCount)
                .HasDefaultValue(0)
                .HasColumnName("vote_count");
            entity.Property(e => e.Notes)
                .HasColumnName("notes");

            entity.HasOne(d => d.Series).WithMany(p => p.Rankings)
                .HasForeignKey(d => d.SeriesId)
                .HasConstraintName("rankings_series_id_fkey");
        });

        modelBuilder.Entity<Series>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("series_pkey");

            entity.ToTable("series");

            entity.HasIndex(e => e.AuthorId, "idx_series_author");

            entity.HasIndex(e => e.EditorId, "idx_series_editor");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.AuthorId).HasColumnName("author_id");
            entity.Property(e => e.CoverImageUrl).HasColumnName("cover_image_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EditorId).HasColumnName("editor_id");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("series_status")
                .HasDefaultValueSql("'draft'::series_status")
                .IsRequired();
            entity.Property(e => e.PublishingFrequency)
                .HasColumnName("publishing_frequency")
                .HasColumnType("publishing_frequency");
            entity.Property(e => e.Genre)
                .HasMaxLength(100)
                .HasColumnName("genre");
            entity.Property(e => e.TargetAudience)
                .HasMaxLength(100)
                .HasColumnName("target_audience");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.SubmittedForReviewAt).HasColumnName("submitted_for_review_at");
            entity.Property(e => e.EditorDefenseNote).HasColumnName("editor_defense_note");
            entity.Property(e => e.EditorDefenseNoteUpdatedAt).HasColumnName("editor_defense_note_updated_at");

            entity.HasOne(d => d.Author).WithMany(p => p.SeriesAuthors)
                .HasForeignKey(d => d.AuthorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("series_author_id_fkey");

            entity.HasOne(d => d.Editor).WithMany(p => p.SeriesEditors)
                .HasForeignKey(d => d.EditorId)
                .HasConstraintName("series_editor_id_fkey");
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("submissions_pkey");

            entity.ToTable("submissions");

            entity.HasIndex(e => e.TaskId, "idx_submissions_task");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.AssistantId).HasColumnName("assistant_id");
            entity.Property(e => e.FileUrl).HasColumnName("file_url");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.ReviewNote).HasColumnName("review_note");
            entity.Property(e => e.Status)
                .HasConversion(
                    v => TaskEnumConversions.StatusFromString(v),
                    v => TaskEnumConversions.StatusToString(v))
                .HasDefaultValueSql("'submitted'::task_status")
                .HasColumnName("status");
            entity.Property(e => e.PreviewImageUrl).HasColumnName("preview_image_url");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("submitted_at");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.VersionNumber)
                .HasDefaultValue(1)
                .HasColumnName("version_number");

            entity.HasOne(d => d.Assistant).WithMany(p => p.SubmissionAssistants)
                .HasForeignKey(d => d.AssistantId)
                .HasConstraintName("submissions_assistant_id_fkey");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.SubmissionReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("submissions_reviewed_by_fkey");

            entity.HasOne(d => d.Task).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("submissions_task_id_fkey");
        });

        modelBuilder.Entity<EditorTask>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tasks_pkey");

            entity.ToTable("tasks");

            entity.HasIndex(e => e.AssignedTo, "idx_tasks_assigned_to");

            entity.HasIndex(e => e.PageId, "idx_tasks_page");

            entity.HasIndex(e => e.Region, "idx_tasks_region_gin").HasMethod("gin");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("id");
            entity.Property(e => e.AssignedBy).HasColumnName("assigned_by");
            entity.Property(e => e.AssignedTo).HasColumnName("assigned_to");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Deadline).HasColumnName("deadline");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.PageId).HasColumnName("page_id");
            entity.Property(e => e.Priority)
                .HasDefaultValue(1)
                .HasColumnName("priority");
            entity.Property(e => e.Region)
                .HasColumnType("jsonb")
                .HasColumnName("region");
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.Status)
                .HasConversion(
                    v => TaskEnumConversions.StatusFromString(v),
                    v => TaskEnumConversions.StatusToString(v))
                .HasDefaultValueSql("'todo'::task_status")
                .HasColumnName("status");
            entity.Property(e => e.TaskType)
                .HasConversion(
                    v => TaskEnumConversions.TypeFromString(v),
                    v => TaskEnumConversions.TypeToString(v))
                .HasColumnName("task_type");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.ResourceUrls)
                .HasColumnType("text[]")
                .HasDefaultValueSql("'{}'::text[]")
                .HasColumnName("resource_urls");
            entity.Property(e => e.Price)
                .HasColumnType("numeric(12,2)")
                .HasDefaultValue(0m)
                .HasColumnName("price");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(20)
                .HasDefaultValue(PaymentStatuses.Unpaid)
                .HasColumnName("payment_status");
            entity.Property(e => e.PaidAt).HasColumnName("paid_at");
            entity.Property(e => e.VnPayTxnRef)
                .HasMaxLength(50)
                .HasColumnName("vnpay_txn_ref");
            entity.Property(e => e.VnPayTransactionNo)
                .HasMaxLength(50)
                .HasColumnName("vnpay_transaction_no");
            entity.Property(e => e.VnPayBankCode)
                .HasMaxLength(20)
                .HasColumnName("vnpay_bank_code");
            entity.Property(e => e.VnPayResponseCode)
                .HasMaxLength(10)
                .HasColumnName("vnpay_response_code");

            entity.HasOne(d => d.AssignedByNavigation).WithMany(p => p.TaskAssignedByNavigations)
                .HasForeignKey(d => d.AssignedBy)
                .HasConstraintName("tasks_assigned_by_fkey");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TaskAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .HasConstraintName("tasks_assigned_to_fkey");

            entity.HasOne(d => d.Page).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.PageId)
                .HasConstraintName("tasks_page_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
