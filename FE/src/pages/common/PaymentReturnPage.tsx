import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Wallet } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';

/**
 * Trang trả về thanh toán cũ (VNPay). Hệ thống hiện chi trả qua Admin payroll (ngày 5 hàng tháng).
 * Giữ route để bookmark/deep-link cũ không 404.
 */
export default function PaymentReturnPage() {
  usePageMeta({ title: 'Thanh toán' });
  const [params] = useSearchParams();
  const success = params.get('success');
  const message = params.get('message');
  const taskId = params.get('taskId');

  return (
    <div className="p-6 max-w-lg mx-auto space-y-5">
      <div className="rounded-2xl border bg-card p-6 space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold">Thanh toán theo kỳ chi</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          MangaFlow không còn thanh toán từng task qua VNPay trên giao diện.
          Thù lao assistant được Admin đối soát và đánh dấu đã chi trong{' '}
          <strong>ngày 5 hàng tháng</strong>.
        </p>
        {(success != null || message || taskId) && (
          <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
            {taskId && <p>Task: {taskId}</p>}
            {success != null && <p>Kết quả tham chiếu: {success}</p>}
            {message && <p>{message}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to="/assistant/income"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Xem thu nhập
        </Link>
        <Link
          to="/assistant/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Về dashboard
        </Link>
      </div>
    </div>
  );
}
