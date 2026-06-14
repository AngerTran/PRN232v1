import { apiRequest } from './apiClient';

export interface CreateTaskPaymentRequest {
  description?: string;
}

export interface CreateTaskPaymentResponse {
  taskId: string;
  paymentUrl: string;
  txnRef: string;
  paymentStatus: string;
}

export interface TaskPaymentReturnResponse {
  taskId: string | null;
  success: boolean;
  message: string;
  paymentStatus: string | null;
  responseCode: string;
  transactionNo: string;
  txnRef: string;
}

/**
 * Tạo URL thanh toán VNPay cho task
 * POST /api/tasks/{taskId}/payment
 */
export async function createTaskPayment(
  taskId: string,
  request: CreateTaskPaymentRequest = {}
): Promise<CreateTaskPaymentResponse> {
  const response = await apiRequest<CreateTaskPaymentResponse>(
    `/api/tasks/${taskId}/payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );
  return response;
}