using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Tasks;
using BLL.Services.Tasks;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/series/{seriesId:guid}/task-prices")]
[Authorize]
[Produces("application/json")]
public class SeriesTaskPriceController : ControllerBase
{
    private readonly TaskPricePolicyService _taskPricePolicyService;

    public SeriesTaskPriceController(TaskPricePolicyService taskPricePolicyService)
    {
        _taskPricePolicyService = taskPricePolicyService;
    }

    [HttpGet]
    [SwaggerOperation(Summary = "Get official task price table for series")]
    [ProducesResponseType(typeof(SeriesTaskPriceTableResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeriesTaskPriceTableResponse>> Get(Guid seriesId, CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _taskPricePolicyService.GetSeriesTaskPricesAsync(userId, seriesId, cancellationToken));
    }

    [HttpPost("proposals")]
    [SwaggerOperation(Summary = "Mangaka creates proposal to update series task prices")]
    [ProducesResponseType(typeof(SeriesTaskPriceProposalResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeriesTaskPriceProposalResponse>> CreateProposal(
        Guid seriesId,
        [FromBody] CreateSeriesTaskPriceProposalRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            return Ok(await _taskPricePolicyService.CreateProposalAsync(userId, seriesId, request, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
