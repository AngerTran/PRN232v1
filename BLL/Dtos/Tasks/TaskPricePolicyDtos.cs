using System.ComponentModel.DataAnnotations;

namespace BLL.Dtos.Tasks;

public record TaskPriceItemDto(
    string TaskType,
    decimal Price,
    string? DisplayName = null,
    int SortOrder = 0);

public record SeriesTaskPriceTableResponse(
    Guid SeriesId,
    IReadOnlyList<TaskPriceItemDto> Items,
    DateTime? UpdatedAt);

public record UpdateCompanyTaskPriceTemplateRequest(
    [Required, MinLength(1)] IReadOnlyList<TaskPriceItemDto> Items);

public record AddTaskTypeRequest(
    [Required, MaxLength(40)] string TaskType,
    [Required, MaxLength(100)] string DisplayName,
    [Range(0, 999999999)] decimal DefaultPrice,
    bool SeedToAllSeries = true);

public record CreateSeriesTaskPriceProposalRequest(
    [Required, MinLength(1)] IReadOnlyList<TaskPriceItemDto> Items,
    [MaxLength(500)] string? Note = null);

public record SeriesTaskPriceProposalResponse(
    Guid ProposalId,
    Guid SeriesId,
    string SeriesTitle,
    Guid ProposedBy,
    string ProposedByName,
    string Status,
    string? Note,
    string? AdminReason,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    Guid? ReviewedBy,
    string? ReviewedByName,
    IReadOnlyList<TaskPriceItemDto> Items);

public record AdminListTaskPriceProposalsResponse(
    IReadOnlyList<SeriesTaskPriceProposalResponse> Items);

public record AdminReviewTaskPriceProposalRequest(
    [MaxLength(500)] string? AdminReason = null,
    IReadOnlyList<TaskPriceItemDto>? OverrideItems = null);
