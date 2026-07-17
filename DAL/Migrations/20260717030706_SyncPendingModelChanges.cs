using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Snapshot sync only. Schema for task pricing / payout bank / schedule chapter
    /// is applied by earlier hand-written migrations; this migration captures the
    /// remaining model diff (payment_reference) and updates AppDbContextModelSnapshot.
    /// </remarks>
    public partial class SyncPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE tasks
                ADD COLUMN IF NOT EXISTS payment_reference character varying(100) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE tasks
                DROP COLUMN IF EXISTS payment_reference;
                """);
        }
    }
}
