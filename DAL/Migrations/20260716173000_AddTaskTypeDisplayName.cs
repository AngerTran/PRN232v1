using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

public partial class AddTaskTypeDisplayName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "display_name",
            table: "task_price_templates",
            type: "character varying(100)",
            maxLength: 100,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<int>(
            name: "sort_order",
            table: "task_price_templates",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.Sql(@"
            update public.task_price_templates set display_name = case task_type
                when 'background' then 'Nền'
                when 'shading' then 'Bóng đổ'
                when 'effects' then 'Hiệu ứng'
                when 'other' then 'Screentone'
                when 'cleanup' then 'Nét sạch'
                when 'lineart' then 'Lineart'
                when 'speech_bubble' then 'Sửa hội thoại'
                else initcap(replace(task_type, '_', ' '))
            end
            where coalesce(trim(display_name), '') = '';

            update public.task_price_templates set sort_order = case task_type
                when 'background' then 10
                when 'shading' then 20
                when 'effects' then 30
                when 'other' then 40
                when 'cleanup' then 50
                when 'lineart' then 60
                when 'speech_bubble' then 70
                else 100
            end
            where sort_order = 0;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "display_name", table: "task_price_templates");
        migrationBuilder.DropColumn(name: "sort_order", table: "task_price_templates");
    }
}
