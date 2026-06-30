using DAL.Common;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardVotePublishingFrequency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<PublishingFrequency>(
                name: "publishing_frequency",
                table: "board_votes",
                type: "publishing_frequency",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "publishing_frequency",
                table: "board_votes");
        }
    }
}
