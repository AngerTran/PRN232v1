using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

/// <inheritdoc />
[DbContext(typeof(Data.AppDbContext))]
[Migration("20260717130000_AddChapterReviewAccepted")]
public partial class AddChapterReviewAccepted : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE chapters
            ADD COLUMN IF NOT EXISTS review_accepted_at timestamp with time zone NULL;

            ALTER TABLE chapters
            ADD COLUMN IF NOT EXISTS review_accepted_by uuid NULL;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'chapters_review_accepted_by_fkey'
                ) THEN
                    ALTER TABLE chapters
                    ADD CONSTRAINT chapters_review_accepted_by_fkey
                    FOREIGN KEY (review_accepted_by)
                    REFERENCES profiles (id)
                    ON DELETE SET NULL;
                END IF;
            END $$;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_review_accepted_by_fkey;
            ALTER TABLE chapters DROP COLUMN IF EXISTS review_accepted_by;
            ALTER TABLE chapters DROP COLUMN IF EXISTS review_accepted_at;
            """);
    }
}
