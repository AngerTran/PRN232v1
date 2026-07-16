using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Tasks;
using BLL.Services.Tasks;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/admin/task-pricing")]
[Authorize]
[Produces("application/json")]
public class AdminTaskPriceController : ControllerBase
{
    private readonly TaskPricePolicyService _taskPricePolicyService;

    public AdminTaskPriceController(TaskPricePolicyService taskPricePolicyService)
    {
        _taskPricePolicyService = taskPricePolicyService;
    }

    [HttpGet("template")]
    [SwaggerOperation(Summary = "Get company default task price template")]
    [ProducesResponseType(typeof(IReadOnlyList<TaskPriceItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TaskPriceItemDto>>> GetTemplate(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _taskPricePolicyService.GetCompanyTemplateAsync(userId, cancellationToken));
    }

    [HttpPut("template")]
    [SwaggerOperation(Summary = "Update company default task price template")]
    [ProducesResponseType(typeof(IReadOnlyList<TaskPriceItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TaskPriceItemDto>>> UpdateTemplate(
        [FromBody] UpdateCompanyTaskPriceTemplateRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            return Ok(await _taskPricePolicyService.UpdateCompanyTemplateAsync(userId, request, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("types")]
    [SwaggerOperation(Summary = "Add a new task type to company catalog")]
    [ProducesResponseType(typeof(TaskPriceItemDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TaskPriceItemDto>> AddTaskType(
        [FromBody] AddTaskTypeRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            return Ok(await _taskPricePolicyService.AddTaskTypeAsync(userId, request, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("seed-all-series")]
    [SwaggerOperation(Summary = "Seed missing series prices from company template")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<object>> SeedAllSeries(CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(new
        {
            added = await _taskPricePolicyService.SeedMissingSeriesPricesAsync(userId, cancellationToken)
        });
    }

    [HttpGet("proposals")]
    [SwaggerOperation(Summary = "List task price proposals for admin review")]
    [ProducesResponseType(typeof(AdminListTaskPriceProposalsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminListTaskPriceProposalsResponse>> ListProposals(
        [FromQuery] Guid? seriesId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _taskPricePolicyService.ListProposalsAsync(userId, seriesId, status, cancellationToken));
    }

    [HttpPost("proposals/{proposalId:guid}/approve")]
    [SwaggerOperation(Summary = "Approve a task price proposal")]
    [ProducesResponseType(typeof(SeriesTaskPriceProposalResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeriesTaskPriceProposalResponse>> ApproveProposal(
        Guid proposalId,
        [FromBody] AdminReviewTaskPriceProposalRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            return Ok(await _taskPricePolicyService.ApproveProposalAsync(userId, proposalId, request, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("proposals/{proposalId:guid}/reject")]
    [SwaggerOperation(Summary = "Reject a task price proposal")]
    [ProducesResponseType(typeof(SeriesTaskPriceProposalResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeriesTaskPriceProposalResponse>> RejectProposal(
        Guid proposalId,
        [FromBody] AdminReviewTaskPriceProposalRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            return Ok(await _taskPricePolicyService.RejectProposalAsync(userId, proposalId, request, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
