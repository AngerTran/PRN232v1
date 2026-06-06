using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddMangakaAssistants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mangaka_assistants",
                columns: table => new
                {
                    mangaka_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assistant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("mangaka_assistants_pkey", x => new { x.mangaka_id, x.assistant_id });
                    table.ForeignKey(
                        name: "mangaka_assistants_assistant_id_fkey",
                        column: x => x.assistant_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "mangaka_assistants_mangaka_id_fkey",
                        column: x => x.mangaka_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_mangaka_assistants_assistant",
                table: "mangaka_assistants",
                column: "assistant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mangaka_assistants");

        }
    }
}
