using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddSeriesBoardReviewClaimLead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_lead",
                table: "series_board_review_claims",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "idx_series_board_review_claims_one_lead",
                table: "series_board_review_claims",
                column: "series_id",
                unique: true,
                filter: "is_lead = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_series_board_review_claims_one_lead",
                table: "series_board_review_claims");

            migrationBuilder.DropColumn(
                name: "is_lead",
                table: "series_board_review_claims");
        }
    }
}
