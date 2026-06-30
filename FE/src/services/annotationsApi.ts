import { apiRequest } from './apiClient';

type ApiEnvelope<T> = T | { data: T };

interface ApiAnnotation {
  id: string;
  pageId: string;
  createdBy?: string | null;
  createdByName?: string | null;
  annotationType?: string | null;
  shape: string;
  content?: string | null;
  color?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export interface PageAnnotation {
  id: string;
  pageId: string;
  createdBy?: string;
  createdByName?: string;
  annotationType?: string;
  shape: string;
  content?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ANNOTATION_TYPE_OPTIONS = [
  { value: 'content', label: 'Nội dung' },
  { value: 'dialogue', label: 'Hội thoại' },
  { value: 'script', label: 'Kịch bản' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'correction', label: 'Chỉnh sửa' },
  { value: 'approval', label: 'Phê duyệt' },
] as const;

function mapAnnotation(item: ApiAnnotation): PageAnnotation {
  return {
    id: item.id,
    pageId: item.pageId,
    createdBy: item.createdBy ?? undefined,
    createdByName: item.createdByName ?? undefined,
    annotationType: item.annotationType ?? undefined,
    shape: item.shape,
    content: item.content ?? undefined,
    color: item.color ?? undefined,
    createdAt: item.createdAt ?? undefined,
    updatedAt: item.updatedAt ?? undefined,
  };
}

export async function getPageAnnotations(pageId: string): Promise<PageAnnotation[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiAnnotation[]>>(`/api/pages/${pageId}/annotations`));
  return items.map(mapAnnotation);
}

export async function createPageAnnotation(
  pageId: string,
  input: {
    annotationType?: string;
    content?: string;
    color?: string;
    shape?: string;
  }
): Promise<PageAnnotation> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiAnnotation>>(`/api/pages/${pageId}/annotations`, {
      method: 'POST',
      body: JSON.stringify({
        shape: input.shape ?? JSON.stringify({ x: 0, y: 0, width: 0, height: 0 }),
        annotationType: input.annotationType,
        content: input.content,
        color: input.color ?? '#ef4444',
      }),
    })
  );
  return mapAnnotation(item);
}

export async function deletePageAnnotation(id: string): Promise<void> {
  await apiRequest<void>(`/api/annotations/${id}`, { method: 'DELETE' });
}
