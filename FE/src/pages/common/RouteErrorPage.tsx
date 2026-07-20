import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import Button from '../../components/ui/Button';

/** Fallback khi route ném lỗi runtime (vd. DOM insertBefore do Google Dịch). */
export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let message = 'Đã xảy ra lỗi không mong muốn.';
  if (isRouteErrorResponse(error)) {
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  const isDomConflict =
    typeof message === 'string'
    && (message.includes('insertBefore') || message.includes('removeChild') || message.includes('NotFoundError'));

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-xl font-bold">Có lỗi khi tải trang</h1>
        <p className="text-sm text-muted-foreground">
          {isDomConflict
            ? 'Trình duyệt có thể đang dịch trang (Google Dịch) và làm xung đột với giao diện. Tắt dịch trang rồi tải lại.'
            : message}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>Quay lại</Button>
          <Button variant="primary" onClick={() => window.location.reload()}>Tải lại trang</Button>
        </div>
      </div>
    </div>
  );
}
