using Microsoft.EntityFrameworkCore.Migrations;
using PRN232v1.Common;

#nullable disable

namespace PRN232v1.Migrations
{
    /// <inheritdoc />
    public partial class AddPageStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'pages'
                          AND column_name = 'status'
                    ) THEN
                        ALTER TABLE pages
                            ADD status page_status NOT NULL DEFAULT 'draft'::page_status;
                    END IF;
                END
                $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE pages DROP COLUMN IF EXISTS status;
                """);
        }
    }
}
