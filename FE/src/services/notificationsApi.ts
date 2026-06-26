import { apiRequest } from './apiClient';
import type { Notification, NotifType } from '../types/domain';

type ApiEnvelope<T> = T | { data: T };

interface ApiNotification {
  id: string;
  title?: string | null;
  message?: string | null;
  linkUrl?: string | null;
  category?: string | null;
  isRead: boolean;
  createdAt?: string | null;
}

interface ApiMarkReadResult {
  id: string;
  isRead: boolean;
}

interface ApiMarkAllReadResult {
  updatedCount: number;
}

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

const VALID_NOTIF_TYPES: NotifType[] = [
  'task_submitted',
  'task_approved',
  'revision_required',
  'deadline_warning',
  'ranking_alert',
  'submission_update',
  'system',
];

function mapCategoryToType(category?: string | null): NotifType {
  if (!category) return 'system';
  return VALID_NOTIF_TYPES.includes(category as NotifType)
    ? (category as NotifType)
    : 'system';
}

function mapNotification(item: ApiNotification): Notification {
  return {
    id: item.id,
    type: mapCategoryToType(item.category),
    title: item.title ?? '',
    message: item.message ?? '',
    read: item.isRead,
    createdAt: item.createdAt ?? new Date().toISOString(),
    linkTo: item.linkUrl ?? undefined,
  };
}

export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const query = unreadOnly ? '?unreadOnly=true' : '';
  const items = unwrap(await apiRequest<ApiEnvelope<ApiNotification[]>>(`/api/notifications${query}`));
  return items.map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const result = unwrap(await apiRequest<ApiEnvelope<ApiMarkReadResult>>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  }));
  return result.isRead;
}

export async function markAllNotificationsRead(): Promise<number> {
  const result = unwrap(await apiRequest<ApiEnvelope<ApiMarkAllReadResult>>('/api/notifications/read-all', {
    method: 'PATCH',
  }));
  return result.updatedCount;
}
