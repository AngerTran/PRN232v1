import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronRight, Send, RotateCcw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  getSubmittedSeries,
  SERIES_SUBMISSION_STATUS_HINT,
  resubmitSeriesForReview,
  REVIEW_EXPIRY_HOURS,
} from '../../services/seriesApi';
import type { Series } from '../../types/domain';

function formatDate(value: string): string {
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch {
    return value;
  }
}

export default function SubmissionHistoryPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);

  const handleResubmit = async (seriesId: string) => {
    setResubmittingId(seriesId);
    setError(null);
    try {
      const updated = await resubmitSeriesForReview(seriesId);
      setSeries(current => current.map(item => (item.id === seriesId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lại series.');
    } finally {
      setResubmittingId(null);
    }
  };

  useEffect(() => {
    setPageMeta({ title: 'Lịch sử nộp series' });
    let isActive = true;
    setLoading(true);
    getSubmittedSeries()
      .then(items => {
        if (isActive) setSeries(items);
      })
      .catch(err => {
        if (isActive) {
          setSeries([]);
          setError(err instanceof Error ? err.message : 'Không thể tải lịch sử nộp series.');
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [setPageMeta]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Lịch sử nộp series</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Theo dõi trạng thái duyệt các series đã gửi lên hội đồng. Series chờ duyệt hết hạn sau {REVIEW_EXPIRY_HOURS} giờ. Ba board cố định sẽ nhận thông báo khi bạn nộp.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải lịch sử nộp series...</p>
      ) : series.length === 0 ? (
        <EmptyState
          icon={<Send size={24} />}
          title="Chưa có series nào được nộp"
          description="Tạo series và nhấn «Gửi xét duyệt» từ trang chi tiết. Ba board cố định sẽ nhận thông báo (hạn 48 giờ)."
        />
      ) : (
        <div className="space-y-3">
          {series.map(item => (
            <Card key={item.id} padding="none">
              <button
                type="button"
                onClick={() => navigate(`/mangaka/series/${item.id}`)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Send size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{item.title}</h3>
                    <Badge status={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.genre} · {item.chaptersCount} chương
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/80">
                    {SERIES_SUBMISSION_STATUS_HINT[item.status]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cập nhật lần cuối: {formatDate(item.updatedAt)}
                    {item.reviewExpiresAt && item.status === 'Submitted' && (
                      <> · Hết hạn: {formatDate(item.reviewExpiresAt)}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'Cancelled' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={resubmittingId === item.id}
                      onClick={e => {
                        e.stopPropagation();
                        handleResubmit(item.id);
                      }}
                    >
                      <RotateCcw size={14} className="mr-1" />
                      Gửi lại
                    </Button>
                  )}
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
