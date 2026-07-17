using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddPublishingScheduleChapter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: chapter_id may already exist from a manual Supabase apply.
            migrationBuilder.Sql("""
                ALTER TABLE publishing_schedules
                ADD COLUMN IF NOT EXISTS chapter_id uuid NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS publishing_schedules_chapter_id_key
                ON publishing_schedules (chapter_id)
                WHERE chapter_id IS NOT NULL;

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'publishing_schedules_chapter_id_fkey'
                    ) THEN
                        ALTER TABLE publishing_schedules
                        ADD CONSTRAINT publishing_schedules_chapter_id_fkey
                        FOREIGN KEY (chapter_id)
                        REFERENCES chapters (id)
                        ON DELETE SET NULL;
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE publishing_schedules
                DROP CONSTRAINT IF EXISTS publishing_schedules_chapter_id_fkey;

                DROP INDEX IF EXISTS publishing_schedules_chapter_id_key;

                ALTER TABLE publishing_schedules
                DROP COLUMN IF EXISTS chapter_id;
                """);
        }
    }
}
