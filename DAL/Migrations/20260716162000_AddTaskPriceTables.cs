using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskPriceTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "task_price_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    task_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    default_price = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("task_price_templates_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "series_task_price_proposals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    series_id = table.Column<Guid>(type: "uuid", nullable: false),
                    proposed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    note = table.Column<string>(type: "text", nullable: true),
                    admin_reason = table.Column<string>(type: "text", nullable: true),
                    reviewed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("series_task_price_proposals_pkey", x => x.id);
                    table.ForeignKey(
                        name: "series_task_price_proposals_proposed_by_fkey",
                        column: x => x.proposed_by,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "series_task_price_proposals_reviewed_by_fkey",
                        column: x => x.reviewed_by,
                        principalTable: "profiles",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "series_task_price_proposals_series_id_fkey",
                        column: x => x.series_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "series_task_prices",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    series_id = table.Column<Guid>(type: "uuid", nullable: false),
                    task_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    official_price = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("series_task_prices_pkey", x => x.id);
                    table.ForeignKey(
                        name: "series_task_prices_approved_by_fkey",
                        column: x => x.approved_by,
                        principalTable: "profiles",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "series_task_prices_series_id_fkey",
                        column: x => x.series_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "series_task_price_proposal_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    proposal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    task_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    proposed_price = table.Column<decimal>(type: "numeric(12,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("series_task_price_proposal_items_pkey", x => x.id);
                    table.ForeignKey(
                        name: "series_task_price_proposal_items_proposal_id_fkey",
                        column: x => x.proposal_id,
                        principalTable: "series_task_price_proposals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "uq_task_price_templates_type",
                table: "task_price_templates",
                column: "task_type",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_series_task_price_proposals_series_status",
                table: "series_task_price_proposals",
                columns: new[] { "series_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_series_task_price_proposals_proposed_by",
                table: "series_task_price_proposals",
                column: "proposed_by");

            migrationBuilder.CreateIndex(
                name: "IX_series_task_price_proposals_reviewed_by",
                table: "series_task_price_proposals",
                column: "reviewed_by");

            migrationBuilder.CreateIndex(
                name: "uq_series_task_price_type",
                table: "series_task_prices",
                columns: new[] { "series_id", "task_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_series_task_prices_approved_by",
                table: "series_task_prices",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "uq_series_task_price_proposal_item_type",
                table: "series_task_price_proposal_items",
                columns: new[] { "proposal_id", "task_type" },
                unique: true);

            migrationBuilder.Sql(@"
                insert into public.task_price_templates(task_type, default_price)
                values
                    ('background', 150000),
                    ('shading', 100000),
                    ('effects', 90000),
                    ('other', 80000),
                    ('cleanup', 120000),
                    ('speech_bubble', 70000),
                    ('lineart', 120000)
                on conflict (task_type) do update
                set default_price = excluded.default_price,
                    updated_at = now();
            ");

            migrationBuilder.Sql(@"
                insert into public.series_task_prices(series_id, task_type, official_price)
                select s.id, t.task_type, t.default_price
                from public.series s
                cross join public.task_price_templates t
                on conflict (series_id, task_type) do nothing;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "series_task_price_proposal_items");

            migrationBuilder.DropTable(
                name: "series_task_prices");

            migrationBuilder.DropTable(
                name: "task_price_templates");

            migrationBuilder.DropTable(
                name: "series_task_price_proposals");
        }
    }
}
