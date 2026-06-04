import { API_BASE_URL, apiRequest } from './apiClient';

export type SubmissionReviewStatus = 'Pending' | 'Approved' | 'Revision Required' | 'Rejected' | string;

export interface SubmissionItem {
  id: string;
  taskId: string;
  assistantId?: string;
  assistantName?: string;
  versionNumber: number;
  fileUrl: string;
  previewImageUrl?: string;
  note?: string;
  status: SubmissionReviewStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  submittedAt?: string;
}

export interface AssistantEarnings {
  approvedSubmissions: number;
  approvedPages: number;
  month: string;
}

type ApiEnvelope<T> = T | { data: T };

interface ApiSubmission {
  id: string;
  taskId: string;
  assistantId?: string | null;
  assistantName?: string | null;
  versionNumber: number;
  fileUrl: string;
  previewImageUrl?: string | null;
  note?: string | null;
  status: string;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
}

interface ApiEarnings {
  approvedSubmissions: number;
  approvedPages: number;
  month: string;
}

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

function mapStatus(status: string): SubmissionReviewStatus {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'revision_required':
      return 'Revision Required';
    case 'submitted':
    default:
      return 'Pending';
  }
}

function mapSubmission(item: ApiSubmission): SubmissionItem {
  return {
    id: item.id,
    taskId: item.taskId,
    assistantId: item.assistantId ?? undefined,
    assistantName: item.assistantName ?? undefined,
    versionNumber: item.versionNumber,
    fileUrl: item.fileUrl,
    previewImageUrl: item.previewImageUrl ?? undefined,
    note: item.note ?? undefined,
    status: mapStatus(item.status),
    reviewedBy: item.reviewedBy ?? undefined,
    reviewedByName: item.reviewedByName ?? undefined,
    reviewedAt: item.reviewedAt ?? undefined,
    submittedAt: item.submittedAt ?? undefined,
  };
}

export async function getTaskSubmissions(taskId: string): Promise<SubmissionItem[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSubmission[]>>(`/api/tasks/${taskId}/submissions`));
  return items.map(mapSubmission);
}

export interface SubmitTaskWorkInput {
  file: File;
  note?: string;
  preview?: File;
}

// Endpoint nhận multipart/form-data nên không dùng apiRequest (vốn ép JSON).
export async function submitTaskWork(taskId: string, input: SubmitTaskWorkInput): Promise<SubmissionItem> {
  const form = new FormData();
  form.append('file', input.file);
  if (input.note) form.append('note', input.note);
  if (input.preview) form.append('preview', input.preview);

  const token = localStorage.getItem('inkflow_access_token');
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/submissions`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; title?: string };
      message = parsed.message || parsed.title || body;
    } catch {
      // giữ nguyên text
    }
    throw new Error(message || `Nộp bài thất bại (status ${response.status})`);
  }

  return mapSubmission(unwrap(await response.json()));
}

export async function reviewSubmission(id: string, approve: boolean, note?: string): Promise<SubmissionItem> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiSubmission>>(`/api/submissions/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ approve, note }),
  }));
  return mapSubmission(item);
}

export async function getMyEarnings(year?: number, month?: number): Promise<AssistantEarnings> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = unwrap(await apiRequest<ApiEnvelope<ApiEarnings>>(`/api/assistants/me/earnings${query}`));
  return result;
}
