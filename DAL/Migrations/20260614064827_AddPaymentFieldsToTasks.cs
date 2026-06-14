using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentFieldsToTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "paid_at",
                table: "tasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_status",
                table: "tasks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "unpaid");

            migrationBuilder.AddColumn<string>(
                name: "vnpay_bank_code",
                table: "tasks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vnpay_response_code",
                table: "tasks",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vnpay_transaction_no",
                table: "tasks",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vnpay_txn_ref",
                table: "tasks",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "paid_at",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "payment_status",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "vnpay_bank_code",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "vnpay_response_code",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "vnpay_transaction_no",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "vnpay_txn_ref",
                table: "tasks");
        }
    }
}
