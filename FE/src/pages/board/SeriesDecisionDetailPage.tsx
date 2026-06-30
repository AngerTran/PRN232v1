import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import type { Series } from '../../types/domain';
import { getSeries, getSeriesStats, type SeriesStats } from '../../services/seriesApi';
import { decideDangerSeries, type DangerSeriesDecision } from '../../services/boardApi';

export default function SeriesDecisionDetailPage() {
  usePageMeta({ title: 'Chi Tiết Quyết Định' });
  const { decisionId = '' } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series | null>(null);
  const [stats, setStats] = useState<SeriesStats | null>(null);
  const [decision, setDecision] = useState<DangerSeriesDecision | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getSeries(decisionId), getSeriesStats(decisionId)])
      .then(([item, itemStats]) => {
        setSeries(item);
        setStats(itemStats);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải series.'));
  }, [decisionId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!decision) return;
    setSubmitting(true);
    setError('');
    try {
      await decideDangerSeries(decisionId, decision, reason.trim() || undefined);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể ghi nhận quyết định.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!series) {
    return <div className="p-6 text-sm text-muted-foreground">{error || 'Đang tải series...'}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/board/series-decisions')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại
      </Button>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="flex gap-4 p-5">
          <img src={series.coverUrl} alt={series.title} className="h-32 w-24 rounded-lg object-cover" />
          <div>
            <h1 className="text-xl font-bold">{series.title}</h1>
            <p className="text-sm text-muted-foreground">{series.mangakaName ?? 'Không rõ mangaka'}</p>
            <p className="mt-3 text-sm text-muted-foreground">{series.synopsis}</p>
            <p className="mt-3 text-sm font-semibold text-red-600">
              Hạng gần nhất: #{stats?.latestRanking?.rankPosition ?? '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      {series.editorDefenseNote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ghi chú bảo vệ từ Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{series.editorDefenseNote}</p>
            {series.editorDefenseNoteUpdatedAt && (
              <p className="text-xs text-muted-foreground">
                Cập nhật {new Date(series.editorDefenseNoteUpdatedAt).toLocaleString('vi-VN')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="max-w-xl">
        <CardHeader><CardTitle>Ra quyết định</CardTitle></CardHeader>
        <CardContent>
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
              <p className="font-medium">Quyết định đã được ghi nhận.</p>
              <Button className="mt-4" onClick={() => navigate('/board/series-decisions')}>Về danh sách</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Select value={decision} onValueChange={value => setDecision(value as DangerSeriesDecision)}>
                <SelectTrigger><SelectValue placeholder="Chọn quyết định..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue">Tiếp tục xuất bản</SelectItem>
                  <SelectItem value="monthly">Chuyển sang monthly</SelectItem>
                  <SelectItem value="hiatus">Tạm dừng</SelectItem>
                  <SelectItem value="cancel">Hủy series</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Lý do quyết định..." />
              <Button type="submit" disabled={!decision || submitting}>{submitting ? 'Đang gửi...' : 'Xác nhận quyết định'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
