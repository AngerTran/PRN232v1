using DAL.Common;
using BLL.Dtos.Tasks;
using DAL.Models;
using DAL.Repositories;
using BLL.Services.Workflow;
using BLL.Dtos.Auth;
using BLL.Dtos.Profiles;
using BLL.Common;
using Microsoft.EntityFrameworkCore;
using BLL.Services.Notifications;

namespace BLL.Services.Profiles;

public class ProfileService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly NotificationService _notificationService;
    private Repository<Profile> Repository => _unitOfWork.Repository<Profile>();

    public ProfileService(UnitOfWork unitOfWork, NotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<UserInfoResponse?> GetUserInfoAsync(
        Guid id,
        string? email = null,
        CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(id, cancellationToken: cancellationToken);
        return profile is null ? null : MapToUserInfo(profile, email);
    }

    public async Task<ProfileResponse?> GetDtoByIdAsync(
        Guid id,
        bool includePayoutBank = false,
        CancellationToken cancellationToken = default)
    {
        var profile = await Repository.GetByIdAsync(id, cancellationToken: cancellationToken);
        return profile is null ? null : MapToDto(profile, includePayoutBank);
    }

    public async Task<IReadOnlyList<ProfileResponse>> ListAllAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Admin, cancellationToken);
        var profiles = await Repository.FindListAsync(cancellationToken: cancellationToken);
        return profiles.Select(p => MapToDto(p)).ToList();
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
        return profiles.Select(p => MapToDto(p)).ToList();
    }

    public async Task<IReadOnlyList<ProfileResponse>> ListEditorsForAssignmentAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        var caller = await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new ProfileForbiddenException("Caller profile not found.");

        if (caller.Role != ProfileRole.Admin && caller.Role != ProfileRole.Board)
        {
            throw new ProfileForbiddenException("Requires board or admin role.");
        }

        var profiles = await Repository.FindListAsync(
            p => p.Role == ProfileRole.Editor && p.IsActive != false,
            cancellationToken: cancellationToken);
        return profiles.Select(p => MapToDto(p)).ToList();
    }

    public async Task<IReadOnlyList<ProfileResponse>> ListBoardMembersForAssignmentAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        var caller = await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new ProfileForbiddenException("Caller profile not found.");

        if (caller.Role != ProfileRole.Admin && caller.Role != ProfileRole.Mangaka)
        {
            throw new ProfileForbiddenException("Requires mangaka or admin role.");
        }

        var profiles = await Repository.FindListAsync(
            p => p.Role == ProfileRole.Board && p.IsActive != false,
            cancellationToken: cancellationToken);
        return profiles.Select(p => MapToDto(p)).ToList();
    }

    public async Task<IReadOnlyList<ProfileResponse>> ListMyAssistantsAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Mangaka, cancellationToken);

        var profiles = await _unitOfWork.Context.MangakaAssistants
            .AsNoTracking()
            .Where(link => link.MangakaId == callerId
                && link.Status == "accepted"
                && link.Assistant.Role == ProfileRole.Assistant
                && link.Assistant.IsActive != false)
            .OrderBy(link => link.Assistant.FullName)
            .Select(link => link.Assistant)
            .ToListAsync(cancellationToken);

        return profiles.Select(p => MapToDto(p)).ToList();
    }

    /// <summary>Danh sách mọi assistant đang active — để mangaka chọn khi mời.</summary>
    public async Task<IReadOnlyList<ProfileResponse>> ListActiveAssistantsDirectoryAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Mangaka, cancellationToken);

        var profiles = await _unitOfWork.Context.Profiles
            .AsNoTracking()
            .Where(p => p.Role == ProfileRole.Assistant && (p.IsActive == null || p.IsActive == true))
            .OrderBy(p => p.FullName)
            .ThenBy(p => p.Email)
            .ToListAsync(cancellationToken);

        return profiles.Select(p => MapToDto(p)).ToList();
    }

    public async Task<AssistantInvitationResponse> InviteAssistantAsync(
        Guid callerId,
        AddAssistantRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Mangaka, cancellationToken);

        Profile? assistant = null;
        if (request.AssistantId is Guid assistantId)
        {
            assistant = await Repository.GetByIdAsync(assistantId, cancellationToken: cancellationToken);
            if (assistant is null
                || assistant.Role != ProfileRole.Assistant
                || assistant.IsActive == false)
            {
                throw new ArgumentException("Không tìm thấy tài khoản trợ lý hợp lệ.");
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            assistant = await _unitOfWork.Context.Profiles
                .FirstOrDefaultAsync(
                    p => p.Email.ToLower() == normalizedEmail
                        && p.Role == ProfileRole.Assistant
                        && p.IsActive != false,
                    cancellationToken);
            if (assistant is null)
            {
                throw new ArgumentException(
                    "Chưa có tài khoản Assistant với email này. Nhờ Admin tạo tài khoản hoặc người đó tự đăng ký với role Assistant trước khi mời.");
            }
        }
        else
        {
            throw new ArgumentException("Chọn trợ lý từ danh sách hoặc nhập email tài khoản Assistant.");
        }

        var invitation = await _unitOfWork.Context.MangakaAssistants
            .Include(link => link.Mangaka)
            .Include(link => link.Assistant)
            .FirstOrDefaultAsync(
                link => link.MangakaId == callerId && link.AssistantId == assistant.Id,
                cancellationToken);

        var shouldNotify = false;
        if (invitation is null)
        {
            invitation = new MangakaAssistant
            {
                MangakaId = callerId,
                AssistantId = assistant.Id,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Context.MangakaAssistants.AddAsync(invitation, cancellationToken);
            shouldNotify = true;
        }
        else if (invitation.Status == "accepted")
        {
            throw new ArgumentException("Trợ lý này đã trong studio của bạn.");
        }
        else if (invitation.Status == "pending")
        {
            throw new ArgumentException("Đã gửi lời mời — đang chờ trợ lý xác nhận.");
        }
        else if (invitation.Status == "rejected")
        {
            invitation.Status = "pending";
            invitation.CreatedAt = DateTime.UtcNow;
            invitation.RespondedAt = null;
            shouldNotify = true;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        invitation.Mangaka ??= await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new ProfileForbiddenException("Caller profile not found.");
        invitation.Assistant ??= assistant;

        if (shouldNotify)
        {
            await _notificationService.CreateAsync(
                assistant.Id,
                "Lời mời tham gia studio",
                $"{invitation.Mangaka.FullName} đã mời bạn tham gia studio với vai trò trợ lý.",
                "/assistant/invitations",
                WorkflowNotificationPaths.CategorySubmission,
                cancellationToken: cancellationToken);
        }

        return MapInvitation(invitation);
    }

    public async Task<IReadOnlyList<AssistantInvitationResponse>> ListSentInvitationsAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Mangaka, cancellationToken);
        var invitations = await InvitationQuery()
            .Where(link => link.MangakaId == callerId)
            .OrderByDescending(link => link.CreatedAt)
            .ToListAsync(cancellationToken);
        return invitations.Select(MapInvitation).ToList();
    }

    public async Task<IReadOnlyList<AssistantInvitationResponse>> ListMyInvitationsAsync(
        Guid callerId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Assistant, cancellationToken);
        var invitations = await InvitationQuery()
            .Where(link => link.AssistantId == callerId)
            .OrderByDescending(link => link.CreatedAt)
            .ToListAsync(cancellationToken);
        return invitations.Select(MapInvitation).ToList();
    }

    public async Task<AssistantInvitationResponse?> RespondToInvitationAsync(
        Guid callerId,
        Guid mangakaId,
        bool accept,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Assistant, cancellationToken);
        var invitation = await InvitationQuery(asNoTracking: false)
            .FirstOrDefaultAsync(
                link => link.MangakaId == mangakaId && link.AssistantId == callerId,
                cancellationToken);
        if (invitation is null)
        {
            return null;
        }

        if (invitation.Status != "pending")
        {
            throw new ArgumentException("This invitation has already been answered.");
        }

        invitation.Status = accept ? "accepted" : "rejected";
        invitation.RespondedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _notificationService.CreateAsync(
            mangakaId,
            accept ? "Trợ lý đã chấp nhận lời mời" : "Trợ lý đã từ chối lời mời",
            $"{invitation.Assistant.FullName} đã {(accept ? "chấp nhận" : "từ chối")} lời mời tham gia studio.",
            cancellationToken: cancellationToken);

        return MapInvitation(invitation);
    }

    public async Task<bool> RemoveMyAssistantAsync(
        Guid callerId,
        Guid assistantId,
        CancellationToken cancellationToken = default)
    {
        await EnsureRoleAsync(callerId, ProfileRoles.Mangaka, cancellationToken);

        var link = await _unitOfWork.Context.MangakaAssistants
            .FirstOrDefaultAsync(
                item => item.MangakaId == callerId && item.AssistantId == assistantId,
                cancellationToken);

        if (link is null)
        {
            return false;
        }

        _unitOfWork.Context.MangakaAssistants.Remove(link);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ProfileResponse?> GetByIdForCallerAsync(
        Guid callerId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var caller = await Repository.GetByIdAsync(callerId, cancellationToken: cancellationToken)
            ?? throw new ProfileForbiddenException("Caller profile not found.");

        var profile = await Repository.GetByIdAsync(id, cancellationToken: cancellationToken);
        if (profile is null)
        {
            return null;
        }

        var includePayoutBank = callerId == id
            || (IsAdmin(caller.Role) && profile.Role == ProfileRole.Assistant);
        return MapToDto(profile, includePayoutBank);
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
        return MapToDto(profile, includePayoutBank: true);
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
        return MapToDto(profile, includePayoutBank: true);
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
        var includePayoutBank = callerId == id
            || (IsAdmin(caller.Role) && profile.Role == ProfileRole.Assistant);
        return MapToDto(profile, includePayoutBank);
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

        if (callerIsAdmin && request.IsActive.HasValue)
        {
            profile.IsActive = request.IsActive.Value;
        }

        if (request.PayoutBankName is not null
            || request.PayoutBankAccountNumber is not null
            || request.PayoutBankAccountHolder is not null)
        {
            if (profile.Role != ProfileRole.Assistant)
            {
                throw new ArgumentException("Chỉ trợ lý mới cập nhật thông tin nhận thù lao.");
            }

            ValidatePayoutBankFields(request);

            profile.PayoutBankName = NormalizeOptional(request.PayoutBankName);
            profile.PayoutBankAccountNumber = NormalizeOptional(request.PayoutBankAccountNumber);
            profile.PayoutBankAccountHolder = NormalizeOptional(request.PayoutBankAccountHolder);
        }
    }

    private static void ValidatePayoutBankFields(UpdateProfileRequest request)
    {
        var hasAny = !string.IsNullOrWhiteSpace(request.PayoutBankName)
            || !string.IsNullOrWhiteSpace(request.PayoutBankAccountNumber)
            || !string.IsNullOrWhiteSpace(request.PayoutBankAccountHolder);
        if (!hasAny)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(request.PayoutBankName)
            || string.IsNullOrWhiteSpace(request.PayoutBankAccountNumber)
            || string.IsNullOrWhiteSpace(request.PayoutBankAccountHolder))
        {
            throw new ArgumentException("Vui lòng nhập đầy đủ ngân hàng, số tài khoản và tên chủ tài khoản.");
        }
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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

    private static ProfileResponse MapToDto(Profile profile, bool includePayoutBank = false) =>
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
            profile.UpdatedAt,
            profile.IsBoardLead,
            includePayoutBank ? profile.PayoutBankName : null,
            includePayoutBank ? profile.PayoutBankAccountNumber : null,
            includePayoutBank ? profile.PayoutBankAccountHolder : null);

    private IQueryable<MangakaAssistant> InvitationQuery(bool asNoTracking = true)
    {
        var query = _unitOfWork.Context.MangakaAssistants
            .Include(link => link.Mangaka)
            .Include(link => link.Assistant);
        return asNoTracking ? query.AsNoTracking() : query;
    }

    private static AssistantInvitationResponse MapInvitation(MangakaAssistant invitation) =>
        new(
            invitation.MangakaId,
            invitation.Mangaka.FullName,
            invitation.Mangaka.Email,
            invitation.AssistantId,
            invitation.Assistant.FullName,
            invitation.Assistant.Email,
            invitation.Status,
            invitation.CreatedAt,
            invitation.RespondedAt);
}
