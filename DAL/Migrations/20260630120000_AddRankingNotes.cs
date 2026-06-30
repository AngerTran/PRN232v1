using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

public partial class AddRankingNotes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "notes",
            table: "rankings",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "notes",
            table: "rankings");
    }
}
