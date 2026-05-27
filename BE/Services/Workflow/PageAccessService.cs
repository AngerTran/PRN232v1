using Microsoft.EntityFrameworkCore;
using PRN232v1.Common;
using PRN232v1.Models;
using PRN232v1.Repositories;
using SeriesEntity = PRN232v1.Models.Series;

namespace PRN232v1.Services.Workflow;

public record PageContext(Page Page, Chapter Chapter, SeriesEntity Series);

public class PageAccessService
{
    private readonly UnitOfWork _unitOfWork;

    public PageAccessService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PageContext?> GetPageContextAsync(Guid pageId, CancellationToken cancellationToken = default)
    {
        var page = await _unitOfWork.Context.Pages
            .AsNoTracking()
            .Include(p => p.Chapter)
            .ThenInclude(c => c.Series)
            .FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);

        return page is null ? null : new PageContext(page, page.Chapter, page.Chapter.Series);
    }

    public async Task<Profile> RequireProfileAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _unitOfWork.Repository<Profile>().GetByIdAsync(userId, cancellationToken: cancellationToken)
        ?? throw new WorkflowForbiddenException("Caller profile not found.");

    public async Task<bool> CanViewPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var caller = await RequireProfileAsync(userId, cancellationToken);
        var ctx = await GetPageContextAsync(pageId, cancellationToken);
        if (ctx is null)
        {
            return false;
        }

        return await CanViewPageAsync(caller, ctx, cancellationToken);
    }

    public async Task<bool> CanViewPageAsync(Profile caller, PageContext ctx, CancellationToken cancellationToken = default)
    {
        if (IsAdmin(caller.Role) || IsBoard(caller.Role))
        {
            return true;
        }

        if (ctx.Series.AuthorId == caller.Id)
        {
            return true;
        }

        if (IsEditor(caller.Role) && ctx.Series.EditorId == caller.Id)
        {
            return true;
        }

        if (IsAssistant(caller.Role))
        {
            return await _unitOfWork.Context.Tasks.AnyAsync(
                t => t.PageId == ctx.Page.Id && t.AssignedTo == caller.Id,
                cancellationToken);
        }

        return false;
    }

    public bool CanManageStudio(Profile caller, PageContext ctx) =>
        IsAdmin(caller.Role)
        || ctx.Series.AuthorId == caller.Id
        || (IsEditor(caller.Role) && ctx.Series.EditorId == caller.Id);

    public bool CanAssignTasks(Profile caller, PageContext ctx) =>
        CanManageStudio(caller, ctx);

    public static bool IsAdmin(ProfileRole role) =>
        role == ProfileRole.Admin;

    public static bool IsMangaka(ProfileRole role) =>
        role == ProfileRole.Mangaka;

    public static bool IsEditor(ProfileRole role) =>
        role == ProfileRole.Editor;

    public static bool IsAssistant(ProfileRole role) =>
        role == ProfileRole.Assistant;

    public static bool IsBoard(ProfileRole role) =>
        role == ProfileRole.Board;

    public static bool IsStaff(ProfileRole role) =>
        IsAdmin(role) || IsEditor(role) || IsBoard(role);
}
