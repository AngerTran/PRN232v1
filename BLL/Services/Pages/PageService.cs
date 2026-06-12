using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Services.Storage;
using BLL.Configuration;
using BLL.Dtos.Pages;
using Microsoft.AspNetCore.Http;

namespace BLL.Services.Pages;

public class PageService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly PageAccessService _pageAccess;
    private readonly SupabaseStorageService _storage;
    private readonly SupabaseOptions _supabaseOptions;
    private Repository<Page> PageRepository => _unitOfWork.Repository<Page>();

    public PageService(
        UnitOfWork unitOfWork,
        PageAccessService pageAccess,
        SupabaseStorageService storage,
        IOptions<SupabaseOptions> supabaseOptions)
    {
        _unitOfWork = unitOfWork;
        _pageAccess = pageAccess;
        _storage = storage;
        _supabaseOptions = supabaseOptions.Value;
    }

    public async Task<IReadOnlyList<PageResponse>?> ListByChapterAsync(
        Guid callerId,
        Guid chapterId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var chapter = await GetChapterWithSeriesAsync(chapterId, asNoTracking: true, cancellationToken);
        if (chapter is null)
        {
            return null;
        }

        if (!CanViewChapter(caller, chapter))
        {
            throw new WorkflowForbiddenException("You do not have permission to view pages for this chapter.");
        }

        var pages = await _unitOfWork.Context.Pages
            .AsNoTracking()
            .Where(p => p.ChapterId == chapterId)
            .OrderBy(p => p.PageNumber)
            .ToListAsync(cancellationToken);

        return pages.Select(MapToDto).ToList();
    }

    public async Task<PageResponse?> CreateAsync(
        Guid callerId,
        Guid chapterId,
        CreatePageRequest request,
        IFormFile file,
        IFormFile? thumbnail,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var chapter = await GetChapterWithSeriesAsync(chapterId, asNoTracking: false, cancellationToken);
        if (chapter is null)
        {
            return null;
        }

        if (!CanCreatePage(caller, chapter))
        {
            throw new WorkflowForbiddenException("Only the series author (mangaka), assistant, or admin can upload pages.");
        }

        EnsurePageProductionAllowed(caller, chapter);

        if (await PageRepository.AnyAsync(
            p => p.ChapterId == chapterId && p.PageNumber == request.PageNumber,
            cancellationToken))
        {
            throw new ArgumentException($"Page number {request.PageNumber} already exists for this chapter.");
        }

        var now = DateTime.UtcNow;
        var pageId = Guid.NewGuid();
        var page = new Page
        {
            Id = pageId,
            ChapterId = chapterId,
            PageNumber = request.PageNumber,
            Status = PageStatus.Draft,
            Width = request.Width,
            Height = request.Height,
            CreatedAt = now,
            UpdatedAt = now
        };

        page.ImageUrl = await UploadPageAssetAsync(chapterId, pageId, "image", file, cancellationToken);
        if (thumbnail is not null && thumbnail.Length > 0)
        {
            page.ThumbnailUrl = await UploadPageAssetAsync(chapterId, pageId, "thumbnail", thumbnail, cancellationToken);
        }

        await PageRepository.AddAsync(page, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(page);
    }

    public async Task<PageResponse?> GetByIdAsync(
        Guid callerId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var ctx = await _pageAccess.GetPageContextAsync(pageId, cancellationToken);
        if (ctx is null)
        {
            return null;
        }

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!await _pageAccess.CanViewPageAsync(caller, ctx, cancellationToken))
        {
            throw new WorkflowForbiddenException("You do not have permission to view this page.");
        }

        return MapToDto(ctx.Page);
    }

    public async Task<PageResponse?> UpdateAsync(
        Guid callerId,
        Guid pageId,
        UpdatePageRequest request,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var page = await _unitOfWork.Context.Pages
            .Include(p => p.Chapter)
            .ThenInclude(c => c.Series)
            .FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);

        if (page is null)
        {
            return null;
        }

        var ctx = new PageContext(page, page.Chapter, page.Chapter.Series);
        if (!_pageAccess.CanManageStudio(caller, ctx))
        {
            throw new WorkflowForbiddenException("Only mangaka, assigned editor, or admin can update pages.");
        }

        if (request.PageNumber is not null && request.PageNumber.Value != page.PageNumber)
        {
            if (await PageRepository.AnyAsync(
                p => p.ChapterId == page.ChapterId && p.PageNumber == request.PageNumber.Value && p.Id != pageId,
                cancellationToken))
            {
                throw new ArgumentException($"Page number {request.PageNumber.Value} already exists for this chapter.");
            }

            page.PageNumber = request.PageNumber.Value;
        }

        if (request.ImageUrl is not null)
        {
            page.ImageUrl = request.ImageUrl;
        }

        if (request.ThumbnailUrl is not null)
        {
            page.ThumbnailUrl = request.ThumbnailUrl;
        }

        if (request.Width is not null)
        {
            page.Width = request.Width;
        }

        if (request.Height is not null)
        {
            page.Height = request.Height;
        }

        page.UpdatedAt = DateTime.UtcNow;
        PageRepository.Update(page);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(page);
    }

    public async Task<PageResponse?> UpdateStatusAsync(
        Guid callerId,
        Guid pageId,
        UpdatePageStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PageStatuses.IsValid(request.Status))
        {
            throw new ArgumentException($"Invalid page status. Allowed: {string.Join(", ", PageStatuses.All)}.");
        }

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var page = await _unitOfWork.Context.Pages
            .Include(p => p.Chapter)
            .ThenInclude(c => c.Series)
            .FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);

        if (page is null)
        {
            return null;
        }

        var ctx = new PageContext(page, page.Chapter, page.Chapter.Series);
        if (!_pageAccess.CanManageStudio(caller, ctx))
        {
            throw new WorkflowForbiddenException("Only mangaka, assigned editor, or admin can update page status.");
        }

        page.Status = PageStatuses.ParseOrThrow(request.Status);
        page.UpdatedAt = DateTime.UtcNow;
        PageRepository.Update(page);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(page);
    }

    public async Task<IReadOnlyList<PageVersionResponse>?> ListVersionsAsync(
        Guid callerId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var ctx = await _pageAccess.GetPageContextAsync(pageId, cancellationToken);
        if (ctx is null)
        {
            return null;
        }

        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        if (!_pageAccess.CanManageStudio(caller, ctx) && !PageAccessService.IsAssistant(caller.Role))
        {
            throw new WorkflowForbiddenException("Only mangaka, assistant, assigned editor, or admin can view page versions.");
        }

        return await _unitOfWork.Context.Submissions
            .AsNoTracking()
            .Where(s => s.Task.PageId == pageId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new PageVersionResponse(
                s.Id,
                s.TaskId,
                s.VersionNumber ?? 1,
                s.FileUrl,
                s.PreviewImageUrl,
                s.Status,
                s.Note,
                s.SubmittedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        Guid callerId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var caller = await _pageAccess.RequireProfileAsync(callerId, cancellationToken);
        var page = await _unitOfWork.Context.Pages
            .Include(p => p.Chapter)
            .ThenInclude(c => c.Series)
            .FirstOrDefaultAsync(p => p.Id == pageId, cancellationToken);

        if (page is null)
        {
            return false;
        }

        var isAuthor = PageAccessService.IsMangaka(caller.Role) && page.Chapter.Series.AuthorId == callerId;
        if (!PageAccessService.IsAdmin(caller.Role) && !isAuthor)
        {
            throw new WorkflowForbiddenException("Only mangaka author or admin can delete pages.");
        }

        PageRepository.Remove(page);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<Chapter?> GetChapterWithSeriesAsync(
        Guid chapterId,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        var query = _unitOfWork.Context.Chapters
            .Include(c => c.Series)
            .AsQueryable();

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(c => c.Id == chapterId, cancellationToken);
    }

    private async Task<string> UploadPageAssetAsync(
        Guid chapterId,
        Guid pageId,
        string name,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".bin";
        }

        var objectPath = $"chapters/{chapterId}/pages/{pageId}/{name}{extension.ToLowerInvariant()}";
        return await _storage.UploadAsync(_supabaseOptions.PageAssetsBucket, objectPath, file, cancellationToken);
    }

    private static bool CanViewChapter(Profile caller, Chapter chapter) =>
        PageAccessService.IsAdmin(caller.Role)
        || PageAccessService.IsBoard(caller.Role)
        || chapter.Series.AuthorId == caller.Id
        || (PageAccessService.IsEditor(caller.Role) && chapter.Series.EditorId == caller.Id)
        || PageAccessService.IsAssistant(caller.Role);

    private static bool CanCreatePage(Profile caller, Chapter chapter) =>
        PageAccessService.IsAdmin(caller.Role)
        || (PageAccessService.IsMangaka(caller.Role) && chapter.Series.AuthorId == caller.Id)
        || PageAccessService.IsAssistant(caller.Role);

    private static void EnsurePageProductionAllowed(Profile caller, Chapter chapter)
    {
        if (PageAccessService.IsAdmin(caller.Role))
        {
            return;
        }

        if (chapter.ChapterNumber == 0 && SeriesWorkflowRules.AllowsProposalChapter(chapter.Series.Status))
        {
            return;
        }

        try
        {
            SeriesWorkflowRules.EnsureAllowsStudioProduction(chapter.Series.Status);
        }
        catch (InvalidOperationException ex)
        {
            throw new WorkflowForbiddenException(ex.Message);
        }
    }

    private static PageResponse MapToDto(Page page) =>
        new(
            page.Id,
            page.ChapterId,
            page.PageNumber,
            page.ImageUrl,
            page.ThumbnailUrl,
            PageStatuses.ToDbValue(page.Status),
            page.Width,
            page.Height,
            page.CreatedAt,
            page.UpdatedAt);
}
