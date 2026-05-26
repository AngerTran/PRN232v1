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
var dataSource = dataSourceBuilder.Build();

builder.Services.AddSingleton(dataSource);
builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
    options.UseNpgsql(
        serviceProvider.GetRequiredService<NpgsqlDataSource>(),
        npgsqlOptions => npgsqlOptions.MapEnum<ProfileRole>("user_role")));

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
