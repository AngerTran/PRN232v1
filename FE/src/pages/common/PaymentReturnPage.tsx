import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { createTaskPayment } from '../../services/paymentApi';
import type { TaskPaymentReturnResponse } from '../../services/paymentApi';
import { formatVnd } from '../../utils/formatCurrency';

interface PaymentReturnParams {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [details, setDetails] = useState<PaymentReturnParams | null>(null);
  const [returnData, setReturnData] = useState<TaskPaymentReturnResponse | null>(null);

  useEffect(() => {
    // Extract VNPay return parameters
    const params: PaymentReturnParams = {
      vnp_Amount: searchParams.get('vnp_Amount') || '',
      vnp_BankCode: searchParams.get('vnp_BankCode') || '',
      vnp_BankTranNo: searchParams.get('vnp_BankTranNo') || '',
      vnp_CardType: searchParams.get('vnp_CardType') || '',
      vnp_OrderInfo: searchParams.get('vnp_OrderInfo') || '',
      vnp_PayDate: searchParams.get('vnp_PayDate') || '',
      vnp_ResponseCode: searchParams.get('vnp_ResponseCode') || '',
      vnp_TmnCode: searchParams.get('vnp_TmnCode') || '',
      vnp_TransactionNo: searchParams.get('vnp_TransactionNo') || '',
      vnp_TransactionStatus: searchParams.get('vnp_TransactionStatus') || '',
      vnp_TxnRef: searchParams.get('vnp_TxnRef') || '',
      vnp_SecureHash: searchParams.get('vnp_SecureHash') || '',
    };

    setDetails(params);

    // Check if payment was successful
    // vnp_ResponseCode = '00' means success
    // vnp_TransactionStatus = '00' means success
    const isSuccess = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

    if (isSuccess) {
      setStatus('success');
      toast.success('Thanh toán thành công!');
    } else if (params.vnp_ResponseCode && params.vnp_ResponseCode !== '00') {
      setStatus('failed');
      toast.error(`Thanh toán thất bại: ${getErrorMessage(params.vnp_ResponseCode)}`);
    } else {
      setStatus('pending');
    }

    // If we have a transaction reference, we could also call backend to verify
    // For now, we rely on VNPay's return parameters
  }, [searchParams]);

  const getErrorMessage = (code: string): string => {
    const messages: Record<string, string> = {
      '07': 'Trừ tiền thành công, giao dịch bị nghi ngờ (liên quan đến lừa đảo, giao dịch bất thường)',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng thanh toán đang bảo trì',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã định nghĩa)',
    };
    return messages[code] || `Mã lỗi: ${code}`;
  };

  const formatAmount = (amount: string): number => {
    // VNPay amount is in VND * 100
    return parseInt(amount, 10) / 100;
  };

  const formatDate = (payDate: string): string => {
    // Format: yyyyMMddHHmmss
    if (payDate.length >= 14) {
      return `${payDate.slice(8, 10)}/${payDate.slice(6, 8)}/${payDate.slice(0, 4)} ${payDate.slice(10, 12)}:${payDate.slice(12, 14)}:${payDate.slice(14, 16)}`;
    }
    return payDate;
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Status Card */}
        <div className="bg-[#252525] rounded-xl border border-[#3A3A3A] p-8 text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 size={48} className="mx-auto text-gray-400 animate-spin" />
              <h2 className="text-lg font-semibold text-white">Đang xử lý kết quả thanh toán...</h2>
              <p className="text-gray-500 text-sm">Vui lòng đợi giây lát</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <h2 className="text-lg font-semibold text-white">Thanh toán thành công!</h2>
              <p className="text-gray-400 text-sm">Giao dịch của bạn đã được xử lý thành công</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <XCircle size={48} className="mx-auto text-red-500" />
              <h2 className="text-lg font-semibold text-white">Thanh toán thất bại</h2>
              <p className="text-gray-400 text-sm">
                {details ? getErrorMessage(details.vnp_ResponseCode) : 'Giao dịch không thành công'}
              </p>
            </div>
          )}

          {status === 'pending' && (
            <div className="space-y-4">
              <AlertCircle size={48} className="mx-auto text-yellow-500" />
              <h2 className="text-lg font-semibold text-white">Đang chờ xử lý</h2>
              <p className="text-gray-400 text-sm">Kết quả giao dịch đang được xử lý, vui lòng kiểm tra lại sau</p>
            </div>
          )}

          {/* Transaction Details */}
          {details && (status === 'success' || status === 'failed') && (
            <div className="mt-6 pt-6 border-t border-[#3A3A3A] space-y-3 text-left">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Chi tiết giao dịch</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Mã giao dịch VNPay</span>
                  <span className="text-white font-mono">{details.vnp_TransactionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mã tham chiếu</span>
                  <span className="text-white font-mono">{details.vnp_TxnRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="text-white">{formatVnd(formatAmount(details.vnp_Amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngân hàng</span>
                  <span className="text-white">{details.vnp_BankCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Loại thẻ</span>
                  <span className="text-white">{details.vnp_CardType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian</span>
                  <span className="text-white">{formatDate(details.vnp_PayDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mã phản hồi</span>
                  <span className={details.vnp_ResponseCode === '00' ? 'text-green-400' : 'text-red-400'}>
                    {details.vnp_ResponseCode} ({details.vnp_ResponseCode === '00' ? 'Thành công' : 'Thất bại'})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Link
            to="/assistant/tasks"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <CreditCard size={16} />
            Quay lại danh sách task
          </Link>
          <Link
            to="/assistant/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-3 text-sm font-medium text-gray-300 hover:bg-[#2E2E2E] transition-colors"
          >
            <ArrowLeft size={16} />
            Về trang chủ
          </Link>
        </div>

        {/* Info note */}
        <div className="mt-6 p-4 rounded-lg bg-[#252525] border border-[#3A3A3A]">
          <p className="text-xs text-gray-500 text-center">
            <strong className="text-gray-400">Lưu ý:</strong> Đây là môi trường VNPay Sandbox.
            Tiền không thực sự được trừ. Dữ liệu chỉ dùng để test luồng thanh toán.
          </p>
        </div>
      </div>
    </div>
  );
}