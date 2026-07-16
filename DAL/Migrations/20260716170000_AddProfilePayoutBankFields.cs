using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

/// <inheritdoc />
public partial class AddProfilePayoutBankFields : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "payout_bank_name",
            table: "profiles",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "payout_bank_account_number",
            table: "profiles",
            type: "character varying(30)",
            maxLength: 30,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "payout_bank_account_holder",
            table: "profiles",
            type: "character varying(255)",
            maxLength: 255,
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "payout_bank_name", table: "profiles");
        migrationBuilder.DropColumn(name: "payout_bank_account_number", table: "profiles");
        migrationBuilder.DropColumn(name: "payout_bank_account_holder", table: "profiles");
    }
}
