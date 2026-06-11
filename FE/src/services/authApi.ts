import { API_BASE_URL, apiRequest } from './apiClient';
import type { User } from '../types/domain';

interface ApiUserInfo {
  id: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: string;
  emailConfirmed?: boolean;
  isActive?: boolean | null;
}

interface ApiAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: ApiUserInfo;
}

interface ApiProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  bio?: string | null;
  emailConfirmed: boolean;
  isActive?: boolean | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName?: string;
}

function normalizeRole(role: string): User['role'] {
  const normalized = role?.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'assistant' || normalized === 'editor' || normalized === 'board') {
    return normalized;
  }
  return 'mangaka';
}

function mapProfileToUser(profile: ApiProfile): User {
  return {
    id: profile.id,
    name: profile.fullName || profile.email || 'MangaFlow User',
    email: profile.email ?? '',
    role: normalizeRole(profile.role),
    avatar: profile.avatarUrl ?? '',
    bio: profile.bio ?? '',
    joinDate: (profile as { createdAt?: string }).createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

function persistSession(token: ApiAuthToken): User {
  const user: User = {
    id: token.user.id,
    name: token.user.fullName || token.user.email || 'MangaFlow User',
    email: token.user.email ?? '',
    role: normalizeRole(token.user.role),
    avatar: token.user.avatarUrl ?? '',
    bio: '',
    joinDate: new Date().toISOString().slice(0, 10),
  };

  localStorage.setItem('inkflow_user', JSON.stringify(user));
  if (token.accessToken) localStorage.setItem('inkflow_access_token', token.accessToken);
  if (token.refreshToken) localStorage.setItem('inkflow_refresh_token', token.refreshToken);
  return user;
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await apiRequest<{ authorizationUrl: string }>('/api/auth/google/supabase-url', { auth: false });
  return response.authorizationUrl;
}

export async function startGoogleLogin(): Promise<void> {
  const url = await getGoogleAuthUrl();
  window.location.assign(url);
}

export async function login(email: string, password: string): Promise<User> {
  const token = await apiRequest<ApiAuthToken>('/api/auth/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return persistSession(token);
}

export async function loginWithGoogleCode(code: string): Promise<User> {
  const token = await apiRequest<ApiAuthToken>('/api/auth/google/code', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return persistSession(token);
}

export async function loginWithGoogleHashTokens(
  accessToken: string,
  refreshToken: string,
): Promise<User> {
  localStorage.setItem('inkflow_access_token', accessToken);
  localStorage.setItem('inkflow_refresh_token', refreshToken);

  const profile = await apiRequest<ApiProfile>('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const user = mapProfileToUser(profile);
  localStorage.setItem('inkflow_user', JSON.stringify(user));
  return user;
}

/**
 * Đăng ký tài khoản. BE có thể yêu cầu xác nhận email; khi đó accessToken trống
 * và caller nên điều hướng người dùng sang trang đăng nhập.
 */
export async function registerWithApi(input: RegisterInput): Promise<{ user: User | null; needsEmailConfirm: boolean }> {
  const token = await apiRequest<ApiAuthToken>('/api/auth/register', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ email: input.email.trim(), password: input.password, fullName: input.fullName }),
  });

  if (token.accessToken) {
    return { user: persistSession(token), needsEmailConfirm: false };
  }
  return { user: null, needsEmailConfirm: true };
}

export async function getMe(): Promise<User> {
  const profile = await apiRequest<ApiProfile>('/api/auth/me');
  return mapProfileToUser(profile);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('inkflow_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export interface UpdateProfileInput {
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<User> {
  const profile = await apiRequest<ApiProfile>('/api/profiles/update', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  const user = mapProfileToUser(profile);
  localStorage.setItem('inkflow_user', JSON.stringify(user));
  return user;
}

export async function refreshSession(): Promise<User | null> {
  const refreshToken = localStorage.getItem('inkflow_refresh_token');
  if (!refreshToken) return null;

  const token = await apiRequest<ApiAuthToken>('/api/auth/refresh-token', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return persistSession(token);
}

export async function logoutWithApi(): Promise<void> {
  const refreshToken = localStorage.getItem('inkflow_refresh_token');
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('inkflow_access_token')
          ? { Authorization: `Bearer ${localStorage.getItem('inkflow_access_token')}` }
          : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    localStorage.removeItem('inkflow_user');
    localStorage.removeItem('inkflow_access_token');
    localStorage.removeItem('inkflow_refresh_token');
  }
}
