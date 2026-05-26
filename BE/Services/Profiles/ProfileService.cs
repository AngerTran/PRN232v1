using PRN232v1.Common;
using PRN232v1.Dtos.Auth;
using PRN232v1.Dtos.Profiles;
using PRN232v1.Models;
using PRN232v1.Repositories;
using PRN232v1.Services.Common;

namespace PRN232v1.Services.Profiles;

public class ProfileService : GenericService<Profile>
{
    public ProfileService(UnitOfWork unitOfWork) : base(unitOfWork)
    {
    }

    public async Task<ProfileResponse?> GetDtoByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var profile = await GetByIdAsync(id, cancellationToken);
        return profile is null ? null : MapToDto(profile);
    }

    public async Task<UserInfoResponse?> GetUserInfoAsync(
        Guid id,
        string? email = null,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetByIdAsync(id, cancellationToken);
        return profile is null ? null : MapToUserInfo(profile, email);
    }

    public async Task EnsureExistsForAuthAsync(
        Guid userId,
        string? fullName,
        string? email,
        CancellationToken cancellationToken = default)
    {
        if (await ExistsAsync(userId, cancellationToken))
        {
            return;
        }

        var profile = new Profile
        {
            Id = userId,
            Role = "reader",
            FullName = fullName ?? email?.Split('@')[0],
            CreatedAt = DateTime.UtcNow,
            EmailNotifEnabled = true,
            PushNotifEnabled = true
        };

        await CreateAsync(profile, cancellationToken);
    }

    private static UserInfoResponse MapToUserInfo(Profile profile, string? email) =>
        new(profile.Id, email, profile.FullName, profile.Role, profile.AvatarUrl);

    public async Task<PagedResult<ProfileResponse>> GetDtosPagedAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var paged = await GetPagedAsync(
            page,
            pageSize,
            orderBy: q => q.OrderByDescending(p => p.CreatedAt),
            cancellationToken: cancellationToken);

        return new PagedResult<ProfileResponse>
        {
            Items = paged.Items.Select(MapToDto).ToList(),
            TotalCount = paged.TotalCount,
            Page = paged.Page,
            PageSize = paged.PageSize
        };
    }

    public async Task<ProfileResponse> CreateFromDtoAsync(CreateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var profile = new Profile
        {
            Id = request.Id,
            Role = request.Role,
            FullName = request.FullName,
            OrgId = request.OrgId,
            AvatarUrl = request.AvatarUrl,
            CreatedAt = DateTime.UtcNow,
            EmailNotifEnabled = true,
            PushNotifEnabled = true
        };

        var created = await CreateAsync(profile, cancellationToken);
        return MapToDto(created);
    }

    public async Task<ProfileResponse?> UpdateFromDtoAsync(
        Guid id,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
        if (profile is null)
        {
            return null;
        }

        if (request.FullName is not null)
        {
            profile.FullName = request.FullName;
        }

        if (request.Role is not null)
        {
            profile.Role = request.Role;
        }

        if (request.OrgId.HasValue)
        {
            profile.OrgId = request.OrgId;
        }

        if (request.AvatarUrl is not null)
        {
            profile.AvatarUrl = request.AvatarUrl;
        }

        if (request.EmailNotifEnabled.HasValue)
        {
            profile.EmailNotifEnabled = request.EmailNotifEnabled;
        }

        if (request.PushNotifEnabled.HasValue)
        {
            profile.PushNotifEnabled = request.PushNotifEnabled;
        }

        var updated = await UpdateAsync(profile, cancellationToken);
        return MapToDto(updated);
    }

    private static ProfileResponse MapToDto(Profile profile) =>
        new(
            profile.Id,
            profile.OrgId,
            profile.FullName,
            profile.Role,
            profile.AvatarUrl,
            profile.EmailNotifEnabled,
            profile.PushNotifEnabled,
            profile.CreatedAt);
}
