using PRN232v1.Common;
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

    public async Task<IReadOnlyList<ProfileResponse>> ListAllAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Admin, cancellationToken);
        var profiles = await Repository.FindListAsync(cancellationToken: cancellationToken);
        return profiles.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<ProfileResponse>> ListByRoleAsync(
        Guid callerId,
        string requiredRole,
        string targetRole,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, requiredRole, cancellationToken);
        var profiles = await Repository.FindListAsync(
            p => p.Role == ParseRoleOrThrow(targetRole) && p.IsActive != false,
            cancellationToken: cancellationToken);
        return profiles.Select(MapToDto).ToList();
    }

    public async Task<ProfileResponse?> GetByIdForCallerAsync(
        Guid callerId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        _ = await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new ProfileForbiddenException("Caller profile not found.");

        var profile = await Repository.GetByIdAsync(id, cancellationToken: cancellationToken);
        return profile is null ? null : MapToDto(profile);
    }

    public async Task EnsureExistsForAuthAsync(
        Guid userId,
        string email,
        string? fullName,
        string? avatarUrl,
        bool emailConfirmed = false,
        CancellationToken cancellationToken = default)
    {
        var existingProfile = await Repository.GetByIdAsync(userId, asNoTracking: false, cancellationToken);
        if (existingProfile is not null)
        {
            if (emailConfirmed && !existingProfile.EmailConfirmed)
            {
                existingProfile.EmailConfirmed = true;
                existingProfile.UpdatedAt = DateTime.UtcNow;
                Repository.Update(existingProfile);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return;
        }

        var profile = new Profile
        {
            Id = userId,
            Email = email,
            FullName = fullName ?? email.Split('@')[0],
            Role = ProfileRole.Assistant,
            AvatarUrl = avatarUrl,
            EmailConfirmed = emailConfirmed,
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
                Role = ProfileRole.Assistant,
                AvatarUrl = request?.AvatarUrl,
                EmailConfirmed = false,
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

    public async Task<ProfileResponse?> ConfirmEmailAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(userId, asNoTracking: false, cancellationToken);
        if (profile is null)
        {
            return null;
        }

        profile.EmailConfirmed = true;
        profile.UpdatedAt = DateTime.UtcNow;
        Repository.Update(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(profile);
    }

    public async Task<ProfileResponse?> UpdateByIdAsync(
        Guid callerId,
        Guid id,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var caller = await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new ProfileForbiddenException("Caller profile not found.");

        if (callerId != id && !IsAdmin(caller.Role))
        {
            throw new ProfileForbiddenException("Only the profile owner or an admin can update this profile.");
        }

        var profile = await Repository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
        if (profile is null)
        {
            return null;
        }

        ApplyUpdate(profile, request, IsAdmin(caller.Role));
        profile.UpdatedAt = DateTime.UtcNow;
        Repository.Update(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(profile);
    }

    public async Task<bool> DeleteByIdAsync(
        Guid callerId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Admin, cancellationToken);

        var profile = await Repository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
        if (profile is null)
        {
            return false;
        }

        profile.IsActive = false;
        profile.UpdatedAt = DateTime.UtcNow;
        Repository.Update(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ProfileResponse?> UpdateFromDtoAsync(
        Guid id,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
        => await UpdateByIdAsync(id, id, request, cancellationToken);

    private static void ApplyUpdate(Profile profile, UpdateProfileRequest request, bool callerIsAdmin)
    {
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

        if (callerIsAdmin && !string.IsNullOrWhiteSpace(request.Role))
        {
            profile.Role = ParseRoleOrThrow(request.Role);
        }
    }

    private async Task EnsureRoleAsync(Guid callerId, string requiredRole, CancellationToken cancellationToken)
    {
        var caller = await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken);
        if (caller is null || caller.Role != ParseRoleOrThrow(requiredRole))
        {
            throw new ProfileForbiddenException($"Requires role '{requiredRole}'.");
        }
    }

    private static bool IsAdmin(ProfileRole role) => role == ProfileRole.Admin;

    private static ProfileRole ParseRoleOrThrow(string role) =>
        ProfileRoles.TryParse(role, out var profileRole)
            ? profileRole
            : throw new ArgumentException($"Invalid profile role '{role}'.");

    private static UserInfoResponse MapToUserInfo(Profile profile, string? email) =>
        new(
            profile.Id,
            email ?? profile.Email,
            profile.FullName,
            profile.AvatarUrl,
            ProfileRoles.ToDbValue(profile.Role),
            profile.EmailConfirmed,
            profile.IsActive);

    private static ProfileResponse MapToDto(Profile profile) =>
        new(
            profile.Id,
            profile.Email,
            profile.FullName,
            ProfileRoles.ToDbValue(profile.Role),
            profile.AvatarUrl,
            profile.Bio,
            profile.EmailConfirmed,
            profile.IsActive,
            profile.CreatedAt,
            profile.UpdatedAt);
}
