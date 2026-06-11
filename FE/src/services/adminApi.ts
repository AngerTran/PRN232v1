import { apiRequest } from './apiClient';
import { getVisibleSeries } from './seriesApi';

export type RoleName = 'admin' | 'mangaka' | 'assistant' | 'editor' | 'board';
export type UserStatus = 'Active' | 'Inactive' | 'Locked' | 'Pending';

interface ApiProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  bio?: string | null;
  emailConfirmed: boolean;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ApiAuthToken {
  user: { id: string };
}

interface ApiActivity {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt?: string | null;
}

interface ApiActivityList {
  data: ApiActivity[];
  total: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  phone?: string;
  avatar: string;
  note?: string;
}

export interface SystemActivity {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: RoleName;
  action: string;
  target: string;
  status: 'Success' | 'Failed' | 'Warning';
}

export interface RoleDefinition {
  id: RoleName;
  label: string;
  color: string;
  bg: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const FALLBACK_AVATAR = 'https://ui-avatars.com/api/?background=fee2e2&color=b91c1c&name=';

function normalizeRole(role: string): RoleName {
  const value = role?.toLowerCase() as RoleName;
  return ['admin', 'mangaka', 'assistant', 'editor', 'board'].includes(value) ? value : 'assistant';
}

function mapProfile(profile: ApiProfile): AdminUser {
  const status: UserStatus = profile.isActive === false
    ? 'Inactive'
    : profile.emailConfirmed ? 'Active' : 'Pending';
  return {
    id: profile.id,
    name: profile.fullName || profile.email,
    email: profile.email,
    role: normalizeRole(profile.role),
    status,
    createdAt: profile.createdAt ?? '',
    updatedAt: profile.updatedAt ?? '',
    lastLogin: profile.updatedAt ?? '',
    avatar: profile.avatarUrl || `${FALLBACK_AVATAR}${encodeURIComponent(profile.fullName || profile.email)}`,
    note: profile.bio ?? undefined,
  };
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return (await apiRequest<ApiProfile[]>('/api/profiles')).map(mapProfile);
}

export async function getAdminUserById(id: string): Promise<AdminUser> {
  return mapProfile(await apiRequest<ApiProfile>(`/api/profiles/${id}`));
}

export async function updateAdminUser(
  id: string,
  input: { fullName?: string; role?: RoleName; bio?: string; isActive?: boolean },
): Promise<AdminUser> {
  return mapProfile(await apiRequest<ApiProfile>(`/api/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }));
}

export async function setAdminUserActive(id: string, isActive: boolean): Promise<AdminUser> {
  return updateAdminUser(id, { isActive });
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: RoleName;
  bio?: string;
  isActive: boolean;
}): Promise<AdminUser> {
  const token = await apiRequest<ApiAuthToken>('/api/auth/register', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ email: input.email.trim(), password: input.password, fullName: input.fullName }),
  });
  return updateAdminUser(token.user.id, {
    fullName: input.fullName,
    role: input.role,
    bio: input.bio,
    isActive: input.isActive,
  });
}

export async function getSystemActivities(userId?: string, limit = 100): Promise<SystemActivity[]> {
  const query = new URLSearchParams({ page: '1', limit: String(limit) });
  if (userId) query.set('userId', userId);
  const response = await apiRequest<ApiActivityList>(`/api/activity-logs?${query}`);
  const users = await getAdminUsers();
  const roles = new Map(users.map(user => [user.id, user.role]));
  return response.data.map(item => ({
    id: item.id,
    timestamp: item.createdAt ?? '',
    userId: item.userId ?? '',
    userName: item.userName ?? 'System',
    userRole: roles.get(item.userId ?? '') ?? 'admin',
    action: item.action ?? 'Unknown',
    target: [item.entityType, item.entityId].filter(Boolean).join(' #') || 'System',
    status: 'Success',
  }));
}

const ROLE_META: Omit<RoleDefinition, 'userCount'>[] = [
  { id: 'admin', label: 'Admin', color: '#D72638', bg: '#FEE2E2', description: 'Quản trị người dùng và giám sát hệ thống.', permissions: ['Quản lý người dùng', 'Xem nhật ký hệ thống', 'Quản lý vai trò'] },
  { id: 'mangaka', label: 'Mangaka', color: '#4B3F72', bg: '#EDE9FE', description: 'Tạo và quản lý manga, chapter và công việc trợ lý.', permissions: ['Quản lý series', 'Quản lý chapter', 'Giao việc cho trợ lý'] },
  { id: 'assistant', label: 'Assistant', color: '#2563EB', bg: '#DBEAFE', description: 'Thực hiện các công việc được mangaka giao.', permissions: ['Xem công việc', 'Nộp kết quả', 'Xem yêu cầu chỉnh sửa'] },
  { id: 'editor', label: 'Editor', color: '#F97316', bg: '#FFEDD5', description: 'Review chapter và theo dõi series được phân công.', permissions: ['Review chapter', 'Theo dõi series', 'Gửi nhận xét'] },
  { id: 'board', label: 'Board', color: '#7C3AED', bg: '#EDE9FE', description: 'Duyệt series, xếp hạng và quản lý lịch xuất bản.', permissions: ['Duyệt series', 'Nhập xếp hạng', 'Quản lý lịch xuất bản'] },
];

export function getRoleDefinitions(users: AdminUser[]): RoleDefinition[] {
  return ROLE_META.map(role => ({
    ...role,
    userCount: users.filter(user => user.role === role.id).length,
  }));
}

export async function getAdminStats(users: AdminUser[]) {
  const series = await getVisibleSeries().catch(() => []);
  const month = new Date().toISOString().slice(0, 7);
  const roleDistribution = Object.fromEntries(
    ROLE_META.map(role => [role.id, users.filter(user => user.role === role.id).length]),
  ) as Record<RoleName, number>;
  return {
    totalUsers: users.length,
    activeUsers: users.filter(user => user.status === 'Active').length,
    inactiveUsers: users.filter(user => user.status === 'Inactive').length,
    lockedUsers: users.filter(user => user.status === 'Inactive').length,
    pendingUsers: users.filter(user => user.status === 'Pending').length,
    publishingSeries: series.filter(item => item.status === 'In Progress' || item.status === 'Published').length,
    newUsersThisMonth: users.filter(user => user.createdAt.startsWith(month)).length,
    roleDistribution,
  };
}
