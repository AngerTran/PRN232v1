using Microsoft.EntityFrameworkCore;
using Npgsql;
using DAL.Common;
using DAL.Data;
using BLL.Extensions;
using BLL.Middleware;
using Microsoft.Extensions.Logging; // Thêm dòng này

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port) &&
    string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    Environment.SetEnvironmentVariable("ASPNETCORE_URLS", $"http://+:{port}");
}

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("SupabaseConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<ProfileRole>("user_role");
dataSourceBuilder.MapEnum<PublishingFrequency>("publishing_frequency");
dataSourceBuilder.MapEnum<SeriesStatus>("series_status");
dataSourceBuilder.MapEnum<ChapterStatus>("chapter_status");
dataSourceBuilder.MapEnum<PageStatus>("page_status");
dataSourceBuilder.MapEnum<TaskStatusDb>("task_status");
dataSourceBuilder.MapEnum<TaskTypeDb>("task_type");
dataSourceBuilder.MapEnum<VoteDecisionDb>("vote_decision");
var dataSource = dataSourceBuilder.Build();

builder.Services.AddSingleton(dataSource);
builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
    options.UseNpgsql(
        serviceProvider.GetRequiredService<NpgsqlDataSource>(),
        npgsqlOptions => npgsqlOptions
            .MapEnum<ProfileRole>("user_role")
            .MapEnum<PublishingFrequency>("publishing_frequency")
            .MapEnum<SeriesStatus>("series_status")
            .MapEnum<ChapterStatus>("chapter_status")
            .MapEnum<PageStatus>("page_status")
            .MapEnum<TaskStatusDb>("task_status")
            .MapEnum<TaskTypeDb>("task_type")
            .MapEnum<VoteDecisionDb>("vote_decision")));

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();
        origins = origins
            .Where(o => !string.IsNullOrWhiteSpace(o))
            .Select(o => o.Trim().TrimEnd('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (origins.Length == 0)
        {
            // Fail closed in non-dev; allow local Vite defaults in Development only.
            if (builder.Environment.IsDevelopment())
            {
                origins =
                [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ];
            }
            else
            {
                throw new InvalidOperationException(
                    "Cors:AllowedOrigins must be configured for non-Development environments.");
            }
        }

        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddRepositoriesAndServices();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAppSwagger();

var app = builder.Build();

var isRunningInContainer = string.Equals(
    Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
    "true",
    StringComparison.OrdinalIgnoreCase);
var swaggerEnabled = app.Environment.IsDevelopment() ||
    string.Equals(builder.Configuration["Swagger:Enabled"], "true", StringComparison.OrdinalIgnoreCase);

if (swaggerEnabled)
{
    app.UseAppSwagger();
}

app.UseMiddleware<AuthExceptionMiddleware>();

if (!app.Environment.IsDevelopment() && !isRunningInContainer)
{
    app.UseHttpsRedirection();
}
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Đảm bảo các cột bổ sung cho task (file tham khảo, giá) tồn tại. Idempotent + an toàn.
try
{
    await using var ensureConn = await dataSource.OpenConnectionAsync();
    await using var ensureCmd = ensureConn.CreateCommand();
    ensureCmd.CommandText = @"
        alter table public.tasks add column if not exists resource_urls text[] not null default '{}'::text[];
        alter table public.tasks add column if not exists price numeric(12,2) not null default 0;
        alter table public.tasks add column if not exists payment_reference varchar(100) null;

        create table if not exists public.task_price_templates (
            id uuid primary key default uuid_generate_v4(),
            task_type varchar(40) not null unique,
            display_name varchar(100) not null default '',
            default_price numeric(12,2) not null,
            sort_order integer not null default 0,
            is_active boolean not null default true,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        );
        alter table public.task_price_templates add column if not exists display_name varchar(100) not null default '';
        alter table public.task_price_templates add column if not exists sort_order integer not null default 0;

        create table if not exists public.series_task_prices (
            id uuid primary key default uuid_generate_v4(),
            series_id uuid not null references public.series(id) on delete cascade,
            task_type varchar(40) not null,
            official_price numeric(12,2) not null,
            approved_at timestamptz null,
            approved_by uuid null references public.profiles(id),
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            constraint uq_series_task_price_type unique(series_id, task_type)
        );

        create table if not exists public.series_task_price_proposals (
            id uuid primary key default uuid_generate_v4(),
            series_id uuid not null references public.series(id) on delete cascade,
            proposed_by uuid not null references public.profiles(id) on delete cascade,
            status varchar(20) not null default 'pending',
            note text null,
            admin_reason text null,
            reviewed_by uuid null references public.profiles(id),
            reviewed_at timestamptz null,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        );

        create table if not exists public.series_task_price_proposal_items (
            id uuid primary key default uuid_generate_v4(),
            proposal_id uuid not null references public.series_task_price_proposals(id) on delete cascade,
            task_type varchar(40) not null,
            proposed_price numeric(12,2) not null,
            constraint uq_series_task_price_proposal_item_type unique(proposal_id, task_type)
        );

        create index if not exists idx_series_task_price_proposals_series_status
            on public.series_task_price_proposals(series_id, status);

        insert into public.task_price_templates(task_type, display_name, default_price, sort_order)
        values
            ('background', 'Nền', 150000, 10),
            ('shading', 'Bóng đổ', 100000, 20),
            ('effects', 'Hiệu ứng', 90000, 30),
            ('other', 'Screentone', 80000, 40),
            ('cleanup', 'Nét sạch', 120000, 50),
            ('lineart', 'Lineart', 120000, 60),
            ('speech_bubble', 'Sửa hội thoại', 70000, 70)
        on conflict (task_type) do nothing;

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
            else sort_order
        end
        where sort_order = 0;

        insert into public.series_task_prices(series_id, task_type, official_price)
        select s.id, t.task_type, t.default_price
        from public.series s
        cross join public.task_price_templates t
        where t.is_active = true
        on conflict (series_id, task_type) do nothing;

        create table if not exists public.mangaka_assistants (
            mangaka_id uuid not null references public.profiles(id) on delete cascade,
            assistant_id uuid not null references public.profiles(id) on delete cascade,
            status varchar(20) not null default 'accepted',
            created_at timestamptz not null default now(),
            responded_at timestamptz null,
            constraint mangaka_assistants_pkey primary key (mangaka_id, assistant_id)
        );
        alter table public.mangaka_assistants add column if not exists status varchar(20) not null default 'accepted';
        alter table public.mangaka_assistants add column if not exists responded_at timestamptz null;
        create index if not exists idx_mangaka_assistants_assistant
            on public.mangaka_assistants(assistant_id);

        alter table public.rankings add column if not exists notes text null;

        -- Cho phép nhiều Board Lead (bỏ unique partial index cũ).
        alter table public.profiles add column if not exists is_board_lead boolean not null default false;
        drop index if exists public.idx_profiles_one_board_lead;

        alter table public.profiles add column if not exists payout_bank_name varchar(100) null;
        alter table public.profiles add column if not exists payout_bank_account_number varchar(30) null;
        alter table public.profiles add column if not exists payout_bank_account_holder varchar(255) null;";
    await ensureCmd.ExecuteNonQueryAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not ensure extra task columns exist.");
}

// Đồng bộ trạng thái series đã có phiếu nhưng còn kẹt pending_review (sửa dữ liệu cũ).
try
{
    await using var syncConn = await dataSource.OpenConnectionAsync();
    await using var syncCmd = syncConn.CreateCommand();
    syncCmd.CommandText = @"
        update public.series s
        set status = 'approved'::series_status, updated_at = now()
        where s.status = 'pending_review'::series_status
          and (select count(*) from public.profiles p where p.role = 'board'::user_role and coalesce(p.is_active, true) = true) > 0
          and (
            select count(distinct v.board_member_id)
            from public.board_votes v
            inner join public.profiles p on p.id = v.board_member_id
            where v.series_id = s.id and p.role = 'board'::user_role and coalesce(p.is_active, true) = true
          ) >= LEAST(3, (
            select count(*) from public.profiles p where p.role = 'board'::user_role and coalesce(p.is_active, true) = true
          ))
          and (
            select count(*) from public.board_votes v
            inner join public.profiles p on p.id = v.board_member_id
            where v.series_id = s.id and p.role = 'board'::user_role and v.decision = 'approve'::vote_decision
          ) > (
            select count(*) from public.board_votes v
            inner join public.profiles p on p.id = v.board_member_id
            where v.series_id = s.id and p.role = 'board'::user_role and v.decision = 'reject'::vote_decision
          );

        update public.series s
        set status = 'cancelled'::series_status, updated_at = now()
        where s.status = 'pending_review'::series_status
          and (select count(*) from public.profiles p where p.role = 'board'::user_role and coalesce(p.is_active, true) = true) > 0
          and (
            select count(distinct v.board_member_id)
            from public.board_votes v
            inner join public.profiles p on p.id = v.board_member_id
            where v.series_id = s.id and p.role = 'board'::user_role and coalesce(p.is_active, true) = true
          ) >= LEAST(3, (
            select count(*) from public.profiles p where p.role = 'board'::user_role and coalesce(p.is_active, true) = true
          ))
          and (
            select count(*) from public.board_votes v
            inner join public.profiles p on p.id = v.board_member_id
            where v.series_id = s.id and p.role = 'board'::user_role and v.decision = 'reject'::vote_decision
          ) >= (
            select count(*) from public.board_votes v
            inner join public.profiles p on p.id = v.board_member_id
            where v.series_id = s.id and p.role = 'board'::user_role and v.decision = 'approve'::vote_decision
          );";
    await syncCmd.ExecuteNonQueryAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not sync series status from board votes.");
}

try
{
    await using var scope = app.Services.CreateAsyncScope();
    var boardService = scope.ServiceProvider.GetRequiredService<BLL.Services.Board.BoardService>();
    await boardService.ExpireStalePendingReviewsAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not expire stale pending series reviews.");
}

// Log application startup
app.Logger.LogInformation("PRN232v1 application started.");

app.Run();
