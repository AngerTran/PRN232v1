using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BLL.Dtos.Tasks;
using BLL.Services.Tasks;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/task-pricing")]
[Authorize]
[Produces("application/json")]
public class TaskPricingCatalogController : ControllerBase
{
    private readonly TaskPricePolicyService _taskPricePolicyService;

    public TaskPricingCatalogController(TaskPricePolicyService taskPricePolicyService)
    {
        _taskPricePolicyService = taskPricePolicyService;
    }

    [HttpGet("catalog")]
    [SwaggerOperation(Summary = "Get active task type catalog (labels + default prices)")]
    [ProducesResponseType(typeof(IReadOnlyList<TaskPriceItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TaskPriceItemDto>>> GetCatalog(CancellationToken cancellationToken)
    {
        return Ok(await _taskPricePolicyService.GetPublicCatalogAsync(cancellationToken));
    }
}
