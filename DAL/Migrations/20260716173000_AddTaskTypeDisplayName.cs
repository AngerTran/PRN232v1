using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DAL.Migrations;

public partial class AddTaskTypeDisplayName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE task_price_templates
            ADD COLUMN IF NOT EXISTS display_name character varying(100) NOT NULL DEFAULT '';

            ALTER TABLE task_price_templates
            ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

            UPDATE public.task_price_templates SET display_name = CASE task_type
                WHEN 'background' THEN 'Nền'
                WHEN 'shading' THEN 'Bóng đổ'
                WHEN 'effects' THEN 'Hiệu ứng'
                WHEN 'other' THEN 'Screentone'
                WHEN 'cleanup' THEN 'Nét sạch'
                WHEN 'lineart' THEN 'Lineart'
                WHEN 'speech_bubble' THEN 'Sửa hội thoại'
                ELSE initcap(replace(task_type, '_', ' '))
            END
            WHERE coalesce(trim(display_name), '') = '';

            UPDATE public.task_price_templates SET sort_order = CASE task_type
                WHEN 'background' THEN 10
                WHEN 'shading' THEN 20
                WHEN 'effects' THEN 30
                WHEN 'other' THEN 40
                WHEN 'cleanup' THEN 50
                WHEN 'lineart' THEN 60
                WHEN 'speech_bubble' THEN 70
                ELSE 100
            END
            WHERE sort_order = 0;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE task_price_templates DROP COLUMN IF EXISTS display_name;
            ALTER TABLE task_price_templates DROP COLUMN IF EXISTS sort_order;
            """);
    }
}
