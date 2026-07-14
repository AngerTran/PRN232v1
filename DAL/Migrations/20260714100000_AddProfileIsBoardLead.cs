using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileIsBoardLead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_board_lead",
                table: "profiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "idx_profiles_one_board_lead",
                table: "profiles",
                column: "is_board_lead",
                unique: true,
                filter: "is_board_lead = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_profiles_one_board_lead",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "is_board_lead",
                table: "profiles");
        }
    }
}
