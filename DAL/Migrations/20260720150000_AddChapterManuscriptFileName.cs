using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

/// <inheritdoc />
[DbContext(typeof(Data.AppDbContext))]
[Migration("20260720150000_AddChapterManuscriptFileName")]
public partial class AddChapterManuscriptFileName : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE chapters
            ADD COLUMN IF NOT EXISTS manuscript_file_name character varying(255) NULL;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE chapters DROP COLUMN IF EXISTS manuscript_file_name;
            """);
    }
}
