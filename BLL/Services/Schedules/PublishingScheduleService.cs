using Microsoft.EntityFrameworkCore;
using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Services.Workflow;
using BLL.Dtos.Schedules;

namespace BLL.Services.Schedules;

public class PublishingScheduleService
{
    private readonly UnitOfWork _unitOfWork;
    private Repository<PublishingSchedule> Repository => _unitOfWork.Repository<PublishingSchedule>();

    public PublishingScheduleService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<PublishingScheduleResponse>> ListBySeriesAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken = default)
    {
        _ = await RequireSeriesAccessAsync(callerId, seriesId, cancellationToken);

        var items = await _unitOfWork.Context.PublishingSchedules
            .AsNoTracking()
            .Where(s => s.SeriesId == seriesId)
            .OrderBy(s => s.PublishDate)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task<PublishingScheduleResponse> CreateAsync(
        Guid callerId,
        Guid seriesId,
        CreatePublishingScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PublishingFrequencies.IsValid(request.Frequency))
        {
            throw new ArgumentException($"Invalid frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
        }

        var series = await RequireScheduleManagerAsync(callerId, seriesId, cancellationToken);
        try
        {
            SeriesWorkflowRules.EnsureAllowsPublishingSchedule(series.Status);
        }
        catch (InvalidOperationException ex)
        {
            throw new WorkflowForbiddenException(ex.Message);
        }

        var schedule = new PublishingSchedule
        {
            Id = Guid.NewGuid(),
            SeriesId = seriesId,
            PublishDate = request.PublishDate,
            Frequency = PublishingFrequencies.ParseOrDefault(request.Frequency),
            IssueNumber = request.IssueNumber,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(schedule, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(schedule);
    }

    public async Task<PublishingScheduleResponse?> UpdateAsync(
        Guid callerId,
        Guid scheduleId,
        UpdatePublishingScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Frequency is not null && !PublishingFrequencies.IsValid(request.Frequency))
        {
            throw new ArgumentException($"Invalid frequency. Allowed: {string.Join(", ", PublishingFrequencies.All)}.");
        }

        var schedule = await Repository.GetByIdAsync(scheduleId, asNoTracking: false, cancellationToken);
        if (schedule is null || schedule.SeriesId is null)
        {
            return null;
        }

        await RequireScheduleManagerAsync(callerId, schedule.SeriesId.Value, cancellationToken);

        if (request.PublishDate is not null)
        {
            schedule.PublishDate = request.PublishDate.Value;
        }

        if (request.Frequency is not null)
        {
            schedule.Frequency = PublishingFrequencies.ParseOrDefault(request.Frequency);
        }

        if (request.IssueNumber is not null)
        {
            schedule.IssueNumber = request.IssueNumber;
        }

        if (request.Notes is not null)
        {
            schedule.Notes = request.Notes;
        }

        Repository.Update(schedule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(schedule);
    }

    public async Task<bool> DeleteAsync(Guid callerId, Guid scheduleId, CancellationToken cancellationToken = default)
    {
        var schedule = await Repository.GetByIdAsync(scheduleId, asNoTracking: false, cancellationToken);
        if (schedule is null || schedule.SeriesId is null)
        {
            return false;
        }

        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        if (!PageAccessService.IsAdmin(caller.Role))
        {
            await RequireScheduleManagerAsync(callerId, schedule.SeriesId.Value, cancellationToken);
        }

        Repository.Remove(schedule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<DAL.Models.Series> RequireSeriesAccessAsync(
        Guid callerId,
        Guid seriesId,
        CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Series not found.");

        if (PageAccessService.IsAdmin(caller.Role)
            || PageAccessService.IsBoard(caller.Role)
            || series.AuthorId == caller.Id
            || (PageAccessService.IsEditor(caller.Role) && series.EditorId == caller.Id))
        {
            return series;
        }

        throw new WorkflowForbiddenException("You do not have permission to view schedules for this series.");
    }

    private async Task<DAL.Models.Series> RequireScheduleManagerAsync(Guid callerId, Guid seriesId, CancellationToken cancellationToken)
    {
        var caller = await _unitOfWork.Repository<Profile>().GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Caller profile not found.");

        var series = await _unitOfWork.Repository<DAL.Models.Series>().GetByIdAsync(seriesId, cancellationToken: cancellationToken)
            ?? throw new WorkflowForbiddenException("Series not found.");

        if (PageAccessService.IsAdmin(caller.Role)
            || PageAccessService.IsBoard(caller.Role)
            || (PageAccessService.IsEditor(caller.Role) && series.EditorId == caller.Id))
        {
            return series;
        }

        throw new WorkflowForbiddenException("Requires board, assigned editor, or admin.");
    }

    private static PublishingScheduleResponse Map(PublishingSchedule s) =>
        new(
            s.Id,
            s.SeriesId,
            s.PublishDate,
            PublishingFrequencies.ToDbValue(s.Frequency),
            s.IssueNumber,
            s.Notes,
            s.CreatedAt);
}
