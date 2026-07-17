using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

/// <inheritdoc />
public partial class AddProfilePayoutBankFields : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS payout_bank_name character varying(100) NULL;

            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS payout_bank_account_number character varying(30) NULL;

            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS payout_bank_account_holder character varying(255) NULL;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE profiles DROP COLUMN IF EXISTS payout_bank_name;
            ALTER TABLE profiles DROP COLUMN IF EXISTS payout_bank_account_number;
            ALTER TABLE profiles DROP COLUMN IF EXISTS payout_bank_account_holder;
            """);
    }
}
