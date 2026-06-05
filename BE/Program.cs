using Microsoft.EntityFrameworkCore;
using Npgsql;
using DAL.Common;
using DAL.Data;
using BLL.Extensions;
using BLL.Middleware;

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
            .MapEnum<TaskTypeDb>("task_type")));

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

if (app.Environment.IsDevelopment())
{
    app.UseAppSwagger();
}

app.UseMiddleware<AuthExceptionMiddleware>();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Đảm bảo cột resource_urls (file tham khảo cho task) tồn tại. Idempotent + an toàn.
try
{
    await using var ensureConn = await dataSource.OpenConnectionAsync();
    await using var ensureCmd = ensureConn.CreateCommand();
    ensureCmd.CommandText = "alter table public.tasks add column if not exists resource_urls text[] not null default '{}'::text[];";
    await ensureCmd.ExecuteNonQueryAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not ensure tasks.resource_urls column exists.");
}

app.Run();
