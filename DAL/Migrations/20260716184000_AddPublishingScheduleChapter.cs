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
            migrationBuilder.AddColumn<Guid>(
                name: "chapter_id",
                table: "publishing_schedules",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "publishing_schedules_chapter_id_key",
                table: "publishing_schedules",
                column: "chapter_id",
                unique: true,
                filter: "chapter_id IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "publishing_schedules_chapter_id_fkey",
                table: "publishing_schedules",
                column: "chapter_id",
                principalTable: "chapters",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "publishing_schedules_chapter_id_fkey",
                table: "publishing_schedules");

            migrationBuilder.DropIndex(
                name: "publishing_schedules_chapter_id_key",
                table: "publishing_schedules");

            migrationBuilder.DropColumn(
                name: "chapter_id",
                table: "publishing_schedules");
        }
    }
}
