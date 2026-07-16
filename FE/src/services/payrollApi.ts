import { apiRequest } from './apiClient';

type ApiEnvelope<T> = T | { data: T };

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export interface AssistantPayrollSummary {
  assistantId: string;
  assistantName: string;
  assistantEmail: string;
  unpaidTaskCount: number;
  unpaidAmount: number;
  paidTaskCount: number;
  paidAmount: number;
  payoutBankName?: string;
  payoutBankAccountNumber?: string;
  payoutBankAccountHolder?: string;
}

export interface UnpaidPayrollTask {
  taskId: string;
  title: string;
  price: number;
  completedAt?: string;
  seriesTitle?: string;
}

export interface AssistantPayrollDetail {
  assistantId: string;
  assistantName: string;
  assistantEmail: string;
  unpaidTaskCount: number;
  unpaidAmount: number;
  unpaidTasks: UnpaidPayrollTask[];
  payoutBankName?: string;
  payoutBankAccountNumber?: string;
  payoutBankAccountHolder?: string;
}

function mapSummary(item: {
  assistantId: string;
  assistantName: string;
  assistantEmail: string;
  unpaidTaskCount: number;
  unpaidAmount: number;
  paidTaskCount: number;
  paidAmount: number;
  payoutBankName?: string | null;
  payoutBankAccountNumber?: string | null;
  payoutBankAccountHolder?: string | null;
}): AssistantPayrollSummary {
  return {
    assistantId: item.assistantId,
    assistantName: item.assistantName,
    assistantEmail: item.assistantEmail,
    unpaidTaskCount: item.unpaidTaskCount,
    unpaidAmount: item.unpaidAmount,
    paidTaskCount: item.paidTaskCount,
    paidAmount: item.paidAmount,
    payoutBankName: item.payoutBankName ?? undefined,
    payoutBankAccountNumber: item.payoutBankAccountNumber ?? undefined,
    payoutBankAccountHolder: item.payoutBankAccountHolder ?? undefined,
  };
}

export async function listPayrollSummaries(year?: number, month?: number): Promise<AssistantPayrollSummary[]> {
  const params = new URLSearchParams();
  if (year != null) params.set('year', String(year));
  if (month != null) params.set('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  const items = unwrap(
    await apiRequest<ApiEnvelope<AssistantPayrollSummary[]>>(`/api/admin/payroll${query}`)
  );
  return (items ?? []).map(mapSummary);
}

export async function getPayrollDetail(
  assistantId: string,
  year?: number,
  month?: number
): Promise<AssistantPayrollDetail> {
  const params = new URLSearchParams();
  if (year != null) params.set('year', String(year));
  if (month != null) params.set('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  const item = unwrap(
    await apiRequest<ApiEnvelope<AssistantPayrollDetail>>(
      `/api/admin/payroll/assistants/${assistantId}${query}`
    )
  );
  return {
    assistantId: item.assistantId,
    assistantName: item.assistantName,
    assistantEmail: item.assistantEmail,
    unpaidTaskCount: item.unpaidTaskCount,
    unpaidAmount: item.unpaidAmount,
    unpaidTasks: (item.unpaidTasks ?? []).map(t => ({
      taskId: t.taskId,
      title: t.title,
      price: t.price,
      completedAt: t.completedAt ?? undefined,
      seriesTitle: t.seriesTitle ?? undefined,
    })),
    payoutBankName: item.payoutBankName ?? undefined,
    payoutBankAccountNumber: item.payoutBankAccountNumber ?? undefined,
    payoutBankAccountHolder: item.payoutBankAccountHolder ?? undefined,
  };
}

export async function markAssistantPayrollPaid(payload: {
  assistantId: string;
  year?: number;
  month?: number;
  taskIds?: string[];
  paymentReference?: string;
}): Promise<{ assistantId: string; tasksMarked: number; totalAmount: number; paymentReference?: string }> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<{ assistantId: string; tasksMarked: number; totalAmount: number; paymentReference?: string }>>(
      '/api/admin/payroll/mark-paid',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  );
  return item;
}
