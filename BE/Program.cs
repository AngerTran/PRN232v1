using Microsoft.EntityFrameworkCore;
using Npgsql;
using PRN232v1.Common;
using PRN232v1.Data;
using PRN232v1.Extensions;
using PRN232v1.Middleware;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("SupabaseConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<ProfileRole>("user_role");
dataSourceBuilder.MapEnum<PublishingFrequency>("publishing_frequency");
dataSourceBuilder.MapEnum<SeriesStatus>("series_status");
dataSourceBuilder.MapEnum<ChapterStatus>("chapter_status");
dataSourceBuilder.MapEnum<PageStatus>("page_status");
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
            .MapEnum<PageStatus>("page_status")));

builder.Services.AddControllers();
builder.Services.AddRepositoriesAndServices();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAppSwagger();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseAppSwagger();
}

app.UseMiddleware<AuthExceptionMiddleware>();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
