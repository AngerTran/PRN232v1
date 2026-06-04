import { apiRequest } from './apiClient';

type ApiEnvelope<T> = T | { data: T };

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export interface ProfileSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface ApiProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
}

function mapProfile(item: ApiProfile): ProfileSummary {
  return {
    id: item.id,
    name: item.fullName || item.email,
    email: item.email,
    avatar: item.avatarUrl ?? undefined,
    role: item.role,
  };
}

/** Danh sách assistant đang hoạt động — yêu cầu vai trò mangaka. */
export async function getAssistants(): Promise<ProfileSummary[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiProfile[]>>('/api/profiles/assistants'));
  return items.map(mapProfile);
}

export async function getProfile(id: string): Promise<ProfileSummary> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiProfile>>(`/api/profiles/${id}`));
  return mapProfile(item);
}
