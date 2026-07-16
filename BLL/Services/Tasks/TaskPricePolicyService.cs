using BLL.Dtos.Tasks;
using BLL.Services.Workflow;
using DAL.Common;
using DAL.Models;
using DAL.Repositories;
using Microsoft.EntityFrameworkCore;

namespace BLL.Services.Tasks;

public class TaskPricePolicyService
{
    private readonly UnitOfWork _unitOfWork;

    public TaskPricePolicyService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<TaskPriceItemDto>> GetCompanyTemplateAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);
        return await LoadCompanyTemplateAsync(cancellationToken);
    }

    /// <summary>Catalog nhãn + giá mặc định — mọi user đã đăng nhập (để FE đồng bộ label).</summary>
    public async Task<IReadOnlyList<TaskPriceItemDto>> GetPublicCatalogAsync(
        CancellationToken cancellationToken = default)
        => await LoadCompanyTemplateAsync(cancellationToken);

    public async Task<IReadOnlyList<TaskPriceItemDto>> UpdateCompanyTemplateAsync(
        Guid callerId,
        UpdateCompanyTaskPriceTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);
        var now = DateTime.UtcNow;
        var normalized = await NormalizeItemsAsync(request.Items, allowUnknownTypes: false, cancellationToken);
        var existing = await _unitOfWork.Context.TaskPriceTemplates
            .ToListAsync(cancellationToken);

        foreach (var item in normalized)
        {
            var current = existing.FirstOrDefault(x => string.Equals(x.TaskType, item.TaskType, StringComparison.OrdinalIgnoreCase));
            if (current is null)
            {
                throw new ArgumentException(
                    $"Loại task '{item.TaskType}' chưa có trong catalog. Dùng API thêm loại mới.");
            }

            current.DefaultPrice = item.Price;
            if (!string.IsNullOrWhiteSpace(item.DisplayName))
            {
                current.DisplayName = item.DisplayName.Trim();
            }
            current.IsActive = true;
            current.UpdatedAt = now;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await LoadCompanyTemplateAsync(cancellationToken);
    }

    public async Task<TaskPriceItemDto> AddTaskTypeAsync(
        Guid callerId,
        AddTaskTypeRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);

        var slug = TaskTypes.NormalizeSlug(request.TaskType);
        var displayName = string.IsNullOrWhiteSpace(request.DisplayName)
            ? TaskTypes.GetDefaultDisplayName(slug)
            : request.DisplayName.Trim();
        if (request.DefaultPrice < 0)
        {
            throw new ArgumentException("Giá phải >= 0.");
        }

        var exists = await _unitOfWork.Context.TaskPriceTemplates
            .AnyAsync(x => x.TaskType == slug, cancellationToken);
        if (exists)
        {
            throw new ArgumentException($"Loại task '{slug}' đã tồn tại.");
        }

        var maxSort = await _unitOfWork.Context.TaskPriceTemplates
            .Select(x => (int?)x.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;
        var now = DateTime.UtcNow;
        var entity = new TaskPriceTemplate
        {
            Id = Guid.NewGuid(),
            TaskType = slug,
            DisplayName = displayName,
            DefaultPrice = request.DefaultPrice,
            SortOrder = maxSort + 10,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        await _unitOfWork.Context.TaskPriceTemplates.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (request.SeedToAllSeries)
        {
            await SeedMissingSeriesPricesInternalAsync(cancellationToken);
        }

        return new TaskPriceItemDto(entity.TaskType, entity.DefaultPrice, entity.DisplayName, entity.SortOrder);
    }

    public async Task<int> SeedMissingSeriesPricesAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);
        return await SeedMissingSeriesPricesInternalAsync(cancellationToken);
    }

    private async Task<int> SeedMissingSeriesPricesInternalAsync(CancellationToken cancellationToken)
    {
        var templates = await _unitOfWork.Context.TaskPriceTemplates
            .AsNoTracking()
            .Where(t => t.IsActive)
            .ToListAsync(cancellationToken);
        if (templates.Count == 0)
        {
            return 0;
        }

        var seriesIds = await _unitOfWork.Context.Series
            .AsNoTracking()
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var added = 0;
        foreach (var seriesId in seriesIds)
        {
            var existingTypes = await _unitOfWork.Context.SeriesTaskPrices
                .Where(x => x.SeriesId == seriesId)
                .Select(x => x.TaskType)
                .ToListAsync(cancellationToken);
            var typeSet = existingTypes.ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var template in templates)
            {
                if (typeSet.Contains(template.TaskType))
                {
                    continue;
                }

                await _unitOfWork.Context.SeriesTaskPrices.AddAsync(new SeriesTaskPrice
                {
                    Id = Guid.NewGuid(),
                    SeriesId = seriesId,
                    TaskType = template.TaskType,
                    OfficialPrice = template.DefaultPrice,
                    CreatedAt = now,
                    UpdatedAt = now
                }, cancellationToken);
                added++;
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return added;
    }

    public async Task<SeriesTaskPriceTableResponse> GetSeriesTaskPricesAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanReadSeriesPricesAsync(callerId, seriesId, cancellationToken);
        var rows = await _unitOfWork.Context.SeriesTaskPrices
            .AsNoTracking()
            .Where(x => x.SeriesId == seriesId)
            .ToListAsync(cancellationToken);

        var templates = await _unitOfWork.Context.TaskPriceTemplates
            .AsNoTracking()
            .Where(t => t.IsActive)
            .ToListAsync(cancellationToken);
        var labelMap = templates.ToDictionary(
            t => t.TaskType,
            t => t.DisplayName,
            StringComparer.OrdinalIgnoreCase);
        var sortMap = templates.ToDictionary(
            t => t.TaskType,
            t => t.SortOrder,
            StringComparer.OrdinalIgnoreCase);

        var items = rows
            .Select(x => new TaskPriceItemDto(
                x.TaskType,
                x.OfficialPrice,
                string.IsNullOrWhiteSpace(labelMap.GetValueOrDefault(x.TaskType))
                    ? TaskTypes.GetDefaultDisplayName(x.TaskType)
                    : labelMap[x.TaskType],
                sortMap.GetValueOrDefault(x.TaskType, 999)))
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.TaskType)
            .ToList();

        return new SeriesTaskPriceTableResponse(
            seriesId,
            items,
            rows.Count == 0 ? null : rows.Max(x => x.UpdatedAt));
    }

    public async Task<SeriesTaskPriceProposalResponse> CreateProposalAsync(
        Guid callerId,
        Guid seriesId,
        CreateSeriesTaskPriceProposalRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = await RequireProfileAsync(callerId, cancellationToken);
        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new ArgumentException("Series not found.");
        if (!PageAccessService.IsAdmin(profile.Role) && !(profile.Role == ProfileRole.Mangaka && series.AuthorId == callerId))
        {
            throw new WorkflowForbiddenException("Chỉ mangaka của series mới được đề xuất chỉnh giá.");
        }

        var hasPending = await _unitOfWork.Context.SeriesTaskPriceProposals
            .AnyAsync(x => x.SeriesId == seriesId && x.Status == TaskPriceProposalStatuses.Pending, cancellationToken);
        if (hasPending)
        {
            throw new ArgumentException("Series đang có đề xuất giá chờ admin duyệt.");
        }

        var normalized = await NormalizeItemsAsync(request.Items, allowUnknownTypes: false, cancellationToken);
        var now = DateTime.UtcNow;
        var proposal = new SeriesTaskPriceProposal
        {
            Id = Guid.NewGuid(),
            SeriesId = seriesId,
            ProposedBy = callerId,
            Status = TaskPriceProposalStatuses.Pending,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        foreach (var item in normalized)
        {
            proposal.Items.Add(new SeriesTaskPriceProposalItem
            {
                Id = Guid.NewGuid(),
                TaskType = item.TaskType,
                ProposedPrice = item.Price
            });
        }

        await _unitOfWork.Context.SeriesTaskPriceProposals.AddAsync(proposal, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetProposalByIdForAdminAsync(proposal.Id, cancellationToken)
            ?? throw new ArgumentException("Could not load proposal.");
    }

    public async Task<AdminListTaskPriceProposalsResponse> ListProposalsAsync(
        Guid callerId,
        Guid? seriesId = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);
        var query = _unitOfWork.Context.SeriesTaskPriceProposals
            .AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.Series)
            .Include(x => x.ProposedByNavigation)
            .Include(x => x.ReviewedByNavigation)
            .AsQueryable();

        if (seriesId.HasValue)
        {
            query = query.Where(x => x.SeriesId == seriesId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && TaskPriceProposalStatuses.IsValid(status))
        {
            query = query.Where(x => x.Status == status.Trim().ToLowerInvariant());
        }

        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        return new AdminListTaskPriceProposalsResponse(rows.Select(MapProposal).ToList());
    }

    public async Task<SeriesTaskPriceProposalResponse> ApproveProposalAsync(
        Guid callerId,
        Guid proposalId,
        AdminReviewTaskPriceProposalRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);
        var proposal = await _unitOfWork.Context.SeriesTaskPriceProposals
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == proposalId, cancellationToken)
            ?? throw new ArgumentException("Proposal not found.");

        if (proposal.Status != TaskPriceProposalStatuses.Pending)
        {
            throw new ArgumentException("Đề xuất đã được xử lý trước đó.");
        }

        var now = DateTime.UtcNow;
        var finalItems = request.OverrideItems is { Count: > 0 }
            ? await NormalizeItemsAsync(request.OverrideItems, allowUnknownTypes: false, cancellationToken)
            : proposal.Items.Select(x => new TaskPriceItemDto(x.TaskType, x.ProposedPrice)).ToList();

        var existingPrices = await _unitOfWork.Context.SeriesTaskPrices
            .Where(x => x.SeriesId == proposal.SeriesId)
            .ToListAsync(cancellationToken);

        foreach (var item in finalItems)
        {
            var current = existingPrices.FirstOrDefault(x => string.Equals(x.TaskType, item.TaskType, StringComparison.OrdinalIgnoreCase));
            if (current is null)
            {
                await _unitOfWork.Context.SeriesTaskPrices.AddAsync(new SeriesTaskPrice
                {
                    Id = Guid.NewGuid(),
                    SeriesId = proposal.SeriesId,
                    TaskType = item.TaskType,
                    OfficialPrice = item.Price,
                    ApprovedAt = now,
                    ApprovedBy = callerId,
                    CreatedAt = now,
                    UpdatedAt = now
                }, cancellationToken);
                continue;
            }

            current.OfficialPrice = item.Price;
            current.ApprovedAt = now;
            current.ApprovedBy = callerId;
            current.UpdatedAt = now;
        }

        proposal.Status = TaskPriceProposalStatuses.Approved;
        proposal.AdminReason = string.IsNullOrWhiteSpace(request.AdminReason) ? null : request.AdminReason.Trim();
        proposal.ReviewedBy = callerId;
        proposal.ReviewedAt = now;
        proposal.UpdatedAt = now;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetProposalByIdForAdminAsync(proposal.Id, cancellationToken)
            ?? throw new ArgumentException("Could not load proposal.");
    }

    public async Task<SeriesTaskPriceProposalResponse> RejectProposalAsync(
        Guid callerId,
        Guid proposalId,
        AdminReviewTaskPriceProposalRequest request,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(callerId, cancellationToken);
        var proposal = await _unitOfWork.Context.SeriesTaskPriceProposals
            .FirstOrDefaultAsync(x => x.Id == proposalId, cancellationToken)
            ?? throw new ArgumentException("Proposal not found.");
        if (proposal.Status != TaskPriceProposalStatuses.Pending)
        {
            throw new ArgumentException("Đề xuất đã được xử lý trước đó.");
        }

        proposal.Status = TaskPriceProposalStatuses.Rejected;
        proposal.AdminReason = string.IsNullOrWhiteSpace(request.AdminReason) ? "Không phù hợp chính sách công ty." : request.AdminReason.Trim();
        proposal.ReviewedBy = callerId;
        proposal.ReviewedAt = DateTime.UtcNow;
        proposal.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetProposalByIdForAdminAsync(proposal.Id, cancellationToken)
            ?? throw new ArgumentException("Could not load proposal.");
    }

    public async Task<decimal?> GetOfficialPriceAsync(
        Guid seriesId,
        string taskType,
        CancellationToken cancellationToken = default)
    {
        var normalized = TaskTypes.NormalizeSlug(taskType);
        return await _unitOfWork.Context.SeriesTaskPrices
            .AsNoTracking()
            .Where(x => x.SeriesId == seriesId && x.TaskType == normalized)
            .Select(x => (decimal?)x.OfficialPrice)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<TaskPriceItemDto>> LoadCompanyTemplateAsync(CancellationToken cancellationToken)
    {
        var rows = await _unitOfWork.Context.TaskPriceTemplates
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.TaskType)
            .ToListAsync(cancellationToken);
        return rows.Select(x => new TaskPriceItemDto(
            x.TaskType,
            x.DefaultPrice,
            string.IsNullOrWhiteSpace(x.DisplayName) ? TaskTypes.GetDefaultDisplayName(x.TaskType) : x.DisplayName,
            x.SortOrder)).ToList();
    }

    private async Task<List<TaskPriceItemDto>> NormalizeItemsAsync(
        IReadOnlyList<TaskPriceItemDto> items,
        bool allowUnknownTypes,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            throw new ArgumentException("Danh sách giá không được để trống.");
        }

        var knownTypes = await _unitOfWork.Context.TaskPriceTemplates
            .AsNoTracking()
            .Where(t => t.IsActive)
            .Select(t => t.TaskType)
            .ToListAsync(cancellationToken);
        var knownSet = knownTypes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var map = new Dictionary<string, TaskPriceItemDto>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in items)
        {
            var type = await NormalizeTaskTypeAsync(item.TaskType, allowUnknownTypes, knownSet, cancellationToken);
            if (item.Price < 0)
            {
                throw new ArgumentException("Giá phải >= 0.");
            }

            var displayName = string.IsNullOrWhiteSpace(item.DisplayName)
                ? null
                : item.DisplayName.Trim();
            map[type] = new TaskPriceItemDto(type, item.Price, displayName, item.SortOrder);
        }

        return map.Values
            .OrderBy(x => x.TaskType)
            .ToList();
    }

    private async Task<string> NormalizeTaskTypeAsync(
        string taskType,
        bool allowUnknownTypes,
        HashSet<string> knownSet,
        CancellationToken cancellationToken)
    {
        var normalized = TaskTypes.NormalizeSlug(taskType);
        if (knownSet.Contains(normalized) || TaskTypes.IsValid(normalized))
        {
            return normalized;
        }

        if (allowUnknownTypes)
        {
            return normalized;
        }

        // Refresh known set in case caller passed stale cache
        var exists = await _unitOfWork.Context.TaskPriceTemplates
            .AsNoTracking()
            .AnyAsync(t => t.IsActive && t.TaskType == normalized, cancellationToken);
        if (exists)
        {
            return normalized;
        }

        throw new ArgumentException($"Invalid task type: {taskType}.");
    }

    private async Task EnsureCanReadSeriesPricesAsync(Guid callerId, Guid seriesId, CancellationToken cancellationToken)
    {
        var caller = await RequireProfileAsync(callerId, cancellationToken);
        if (PageAccessService.IsAdmin(caller.Role) || PageAccessService.IsBoard(caller.Role))
        {
            return;
        }

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new ArgumentException("Series not found.");

        var canRead =
            (caller.Role == ProfileRole.Mangaka && series.AuthorId == caller.Id)
            || (caller.Role == ProfileRole.Editor && series.EditorId == caller.Id)
            || (caller.Role == ProfileRole.Assistant && await _unitOfWork.Context.Tasks.AnyAsync(
                t => t.AssignedTo == caller.Id && t.Page.Chapter.SeriesId == seriesId, cancellationToken));

        if (!canRead)
        {
            throw new WorkflowForbiddenException("Bạn không có quyền xem bảng giá của series này.");
        }
    }

    private async Task<SeriesTaskPriceProposalResponse?> GetProposalByIdForAdminAsync(Guid proposalId, CancellationToken cancellationToken)
    {
        var row = await _unitOfWork.Context.SeriesTaskPriceProposals
            .AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.Series)
            .Include(x => x.ProposedByNavigation)
            .Include(x => x.ReviewedByNavigation)
            .FirstOrDefaultAsync(x => x.Id == proposalId, cancellationToken);
        return row is null ? null : MapProposal(row);
    }

    private static SeriesTaskPriceProposalResponse MapProposal(SeriesTaskPriceProposal row)
    {
        return new SeriesTaskPriceProposalResponse(
            row.Id,
            row.SeriesId,
            row.Series.Title,
            row.ProposedBy,
            row.ProposedByNavigation.FullName,
            row.Status,
            row.Note,
            row.AdminReason,
            row.CreatedAt,
            row.ReviewedAt,
            row.ReviewedBy,
            row.ReviewedByNavigation?.FullName,
            row.Items
                .OrderBy(i => i.TaskType)
                .Select(i => new TaskPriceItemDto(i.TaskType, i.ProposedPrice))
                .ToList());
    }

    private async Task<Profile> RequireProfileAsync(Guid callerId, CancellationToken cancellationToken)
    {
        return await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");
    }

    private async Task RequireAdminAsync(Guid callerId, CancellationToken cancellationToken)
    {
        var caller = await RequireProfileAsync(callerId, cancellationToken);
        if (!PageAccessService.IsAdmin(caller.Role))
        {
            throw new WorkflowForbiddenException("Chỉ Admin được thao tác mục này.");
        }
    }
}
