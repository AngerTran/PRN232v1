using PRN232v1.Dtos.Auth;
using PRN232v1.Dtos.Profiles;
using PRN232v1.Models;
using PRN232v1.Repositories;

namespace PRN232v1.Services.Profiles;

public class ProfileService
{
    private readonly UnitOfWork _unitOfWork;
    private Repository<Profile> Repository => _unitOfWork.Repository<Profile>();

    public ProfileService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<UserInfoResponse?> GetUserInfoAsync(
        Guid id,
        string? email = null,
        CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(id, cancellationToken: cancellationToken);
        return profile is null ? null : MapToUserInfo(profile, email);
    }

    public async Task<ProfileResponse?> GetDtoByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(id, cancellationToken: cancellationToken);
        return profile is null ? null : MapToDto(profile);
    }

    public async Task EnsureExistsForAuthAsync(
        Guid userId,
        string email,
        string? fullName,
        string? avatarUrl,
        CancellationToken cancellationToken = default)
    {
        if (await Repository.AnyAsync(p => p.Id == userId, cancellationToken))
        {
            return;
        }

        var profile = new Profile
        {
            Id = userId,
            Email = email,
            FullName = fullName ?? email.Split('@')[0],
            AvatarUrl = avatarUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Repository.AddAsync(profile, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ProfileResponse> SyncFromAuthAsync(
        Guid userId,
        SyncProfileRequest? request,
        string? email,
        CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(userId, asNoTracking: false, cancellationToken);

        if (profile is null)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                throw new InvalidOperationException("Profile not found and email is required to create one.");
            }

            profile = new Profile
            {
                Id = userId,
                Email = email,
                FullName = request?.FullName ?? email.Split('@')[0],
                AvatarUrl = request?.AvatarUrl,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await Repository.AddAsync(profile, cancellationToken);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request?.FullName))
            {
                profile.FullName = request.FullName;
            }

            if (request?.AvatarUrl is not null)
            {
                profile.AvatarUrl = request.AvatarUrl;
            }

            profile.UpdatedAt = DateTime.UtcNow;
            Repository.Update(profile);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(profile);
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

        if (request.AvatarUrl is not null)
        {
            profile.AvatarUrl = request.AvatarUrl;
        }

        if (request.Bio is not null)
        {
            profile.Bio = request.Bio;
        }

        profile.UpdatedAt = DateTime.UtcNow;
        Repository.Update(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(profile);
    }

    private static UserInfoResponse MapToUserInfo(Profile profile, string? email) =>
        new(profile.Id, email ?? profile.Email, profile.FullName, profile.AvatarUrl, profile.IsActive);

    private static ProfileResponse MapToDto(Profile profile) =>
        new(
            profile.Id,
            profile.Email,
            profile.FullName,
            profile.AvatarUrl,
            profile.Bio,
            profile.IsActive,
            profile.CreatedAt,
            profile.UpdatedAt);
}
