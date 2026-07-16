import { apiRequest } from './apiClient';

type ApiEnvelope<T> = T | { data: T };

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export interface TaskPriceItem {
  taskType: string;
  price: number;
  displayName?: string;
  sortOrder?: number;
}

export interface SeriesTaskPriceTable {
  seriesId: string;
  items: TaskPriceItem[];
  updatedAt?: string;
}

export interface TaskPriceProposal {
  proposalId: string;
  seriesId: string;
  seriesTitle: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  note?: string;
  adminReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  items: TaskPriceItem[];
}

function mapItem(x: {
  taskType: string;
  price: number;
  displayName?: string | null;
  sortOrder?: number;
}): TaskPriceItem {
  return {
    taskType: x.taskType,
    price: Number(x.price) || 0,
    displayName: x.displayName ?? undefined,
    sortOrder: x.sortOrder ?? undefined,
  };
}

function mapProposal(x: any): TaskPriceProposal {
  return {
    proposalId: x.proposalId,
    seriesId: x.seriesId,
    seriesTitle: x.seriesTitle,
    proposedBy: x.proposedBy,
    proposedByName: x.proposedByName,
    status: x.status,
    note: x.note ?? undefined,
    adminReason: x.adminReason ?? undefined,
    createdAt: x.createdAt,
    reviewedAt: x.reviewedAt ?? undefined,
    reviewedBy: x.reviewedBy ?? undefined,
    reviewedByName: x.reviewedByName ?? undefined,
    items: (x.items ?? []).map(mapItem),
  };
}

export async function getTaskTypeCatalog(): Promise<TaskPriceItem[]> {
  const items = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceItem[]>>('/api/task-pricing/catalog')
  );
  return (items ?? []).map(mapItem);
}

export async function getSeriesTaskPriceTable(seriesId: string): Promise<SeriesTaskPriceTable> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<SeriesTaskPriceTable>>(`/api/series/${seriesId}/task-prices`)
  );
  return {
    seriesId: item.seriesId,
    updatedAt: item.updatedAt ?? undefined,
    items: (item.items ?? []).map(mapItem),
  };
}

export async function createSeriesTaskPriceProposal(
  seriesId: string,
  payload: { note?: string; items: TaskPriceItem[] }
): Promise<TaskPriceProposal> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceProposal>>(`/api/series/${seriesId}/task-prices/proposals`, {
      method: 'POST',
      body: JSON.stringify({
        note: payload.note,
        items: payload.items.map(i => ({ taskType: i.taskType, price: i.price })),
      }),
    })
  );
  return mapProposal(item);
}

export async function getCompanyTaskPriceTemplate(): Promise<TaskPriceItem[]> {
  const items = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceItem[]>>('/api/admin/task-pricing/template')
  );
  return (items ?? []).map(mapItem);
}

export async function updateCompanyTaskPriceTemplate(items: TaskPriceItem[]): Promise<TaskPriceItem[]> {
  const result = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceItem[]>>('/api/admin/task-pricing/template', {
      method: 'PUT',
      body: JSON.stringify({
        items: items.map(i => ({
          taskType: i.taskType,
          price: i.price,
          displayName: i.displayName,
        })),
      }),
    })
  );
  return (result ?? []).map(mapItem);
}

export async function addTaskType(payload: {
  taskType: string;
  displayName: string;
  defaultPrice: number;
  seedToAllSeries?: boolean;
}): Promise<TaskPriceItem> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceItem>>('/api/admin/task-pricing/types', {
      method: 'POST',
      body: JSON.stringify({
        taskType: payload.taskType,
        displayName: payload.displayName,
        defaultPrice: payload.defaultPrice,
        seedToAllSeries: payload.seedToAllSeries ?? true,
      }),
    })
  );
  return mapItem(item);
}

export async function seedAllSeriesTaskPrices(): Promise<number> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<{ added: number }>>('/api/admin/task-pricing/seed-all-series', {
      method: 'POST',
    })
  );
  return Number(item.added) || 0;
}

export async function listTaskPriceProposals(filters?: { seriesId?: string; status?: string }): Promise<TaskPriceProposal[]> {
  const params = new URLSearchParams();
  if (filters?.seriesId) params.set('seriesId', filters.seriesId);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = unwrap(
    await apiRequest<ApiEnvelope<{ items: TaskPriceProposal[] }>>(`/api/admin/task-pricing/proposals${query}`)
  );
  return (res.items ?? []).map(mapProposal);
}

export async function approveTaskPriceProposal(
  proposalId: string,
  payload: { adminReason?: string; overrideItems?: TaskPriceItem[] }
): Promise<TaskPriceProposal> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceProposal>>(`/api/admin/task-pricing/proposals/${proposalId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
  return mapProposal(item);
}

export async function rejectTaskPriceProposal(
  proposalId: string,
  payload: { adminReason?: string }
): Promise<TaskPriceProposal> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<TaskPriceProposal>>(`/api/admin/task-pricing/proposals/${proposalId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
  return mapProposal(item);
}
