using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddEditorDefenseNoteAndAnnotationScript : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "editor_defense_note",
                table: "series",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "editor_defense_note_updated_at",
                table: "series",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "editor_defense_note",
                table: "series");

            migrationBuilder.DropColumn(
                name: "editor_defense_note_updated_at",
                table: "series");
        }
    }
}
