using Microsoft.EntityFrameworkCore;
using PRN232v1.Data;
using PRN232v1.Extensions;
using PRN232v1.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("SupabaseConnection")));

builder.Services.AddControllers();
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
