using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddAssistantInvitationStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "responded_at",
                table: "mangaka_assistants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                ALTER TABLE mangaka_assistants
                    ADD COLUMN status varchar(20) NOT NULL DEFAULT 'accepted';
                ALTER TABLE mangaka_assistants
                    ALTER COLUMN status SET DEFAULT 'pending';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "responded_at",
                table: "mangaka_assistants");

            migrationBuilder.DropColumn(
                name: "status",
                table: "mangaka_assistants");
        }
    }
}
