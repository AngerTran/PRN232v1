using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddSeriesBoardReviewClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "series_board_review_claims",
                columns: table => new
                {
                    series_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "public"),
                    claimed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("series_board_review_claims_pkey", x => new { x.series_id, x.board_member_id });
                    table.ForeignKey(
                        name: "series_board_review_claims_board_member_id_fkey",
                        column: x => x.board_member_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "series_board_review_claims_series_id_fkey",
                        column: x => x.series_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_series_board_review_claims_board",
                table: "series_board_review_claims",
                column: "board_member_id");

            migrationBuilder.Sql("""
                INSERT INTO series_board_review_claims (series_id, board_member_id, source, claimed_at)
                SELECT DISTINCT bv.series_id, bv.board_member_id, 'legacy', COALESCE(bv.created_at, now())
                FROM board_votes bv
                INNER JOIN series s ON s.id = bv.series_id
                WHERE bv.series_id IS NOT NULL
                  AND bv.board_member_id IS NOT NULL
                  AND s.status = 'pending_review'
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "series_board_review_claims");
        }
    }
}
