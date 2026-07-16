using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DAL.Common;
using BLL.Dtos.Payroll;
using BLL.Services.Payroll;
using Swashbuckle.AspNetCore.Annotations;

namespace PRN232v1.Controllers;

[ApiController]
[Route("api/admin/payroll")]
[Authorize]
[Produces("application/json")]
public class PayrollController : ControllerBase
{
    private readonly PayrollService _payrollService;

    public PayrollController(PayrollService payrollService)
    {
        _payrollService = payrollService;
    }

    [HttpGet]
    [SwaggerOperation(
        Summary = "List assistant payroll summaries",
        Description = "Admin view: approved task earnings grouped by assistant, with unpaid/paid totals.")]
    [ProducesResponseType(typeof(IReadOnlyList<AssistantPayrollSummaryItem>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AssistantPayrollSummaryItem>>> List(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _payrollService.ListSummariesAsync(userId, year, month, cancellationToken));
    }

    [HttpGet("assistants/{assistantId:guid}")]
    [SwaggerOperation(Summary = "Get unpaid tasks for an assistant")]
    [ProducesResponseType(typeof(AssistantPayrollDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssistantPayrollDetailResponse>> Detail(
        Guid assistantId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var detail = await _payrollService.GetAssistantDetailAsync(userId, assistantId, year, month, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost("mark-paid")]
    [SwaggerOperation(
        Summary = "Mark assistant tasks as paid (batch)",
        Description = "After real-world bank transfer, admin marks approved unpaid tasks as paid.")]
    [ProducesResponseType(typeof(MarkAssistantPayrollPaidResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MarkAssistantPayrollPaidResponse>> MarkPaid(
        [FromBody] MarkAssistantPayrollPaidRequest request,
        CancellationToken cancellationToken)
    {
        if (!this.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _payrollService.MarkPaidAsync(userId, request, cancellationToken));
    }
}
