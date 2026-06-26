using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddSeriesBoardReviewInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "submitted_for_review_at",
                table: "series",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "series_board_review_invitations",
                columns: table => new
                {
                    series_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    responded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("series_board_review_invitations_pkey", x => new { x.series_id, x.board_member_id });
                    table.ForeignKey(
                        name: "series_board_review_invitations_board_member_id_fkey",
                        column: x => x.board_member_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "series_board_review_invitations_series_id_fkey",
                        column: x => x.series_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_series_board_review_invitations_board",
                table: "series_board_review_invitations",
                column: "board_member_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "series_board_review_invitations");

            migrationBuilder.DropColumn(
                name: "submitted_for_review_at",
                table: "series");
        }
    }
}
