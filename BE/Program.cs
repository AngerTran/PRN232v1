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
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());
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
            on public.mangaka_assistants(assistant_id);";
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
