import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, CalendarDays, CalendarPlus, BookOpen, User, Eye } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import type { Series, SeriesStatus } from '../../types/domain';
import {
  getSeries,
  getSeriesSchedules,
  canSchedulePublishing,
  type PublishingScheduleItem,
} from '../../services/seriesApi';
import { getBoardVoteProgress, claimSeriesLead, type BoardVoteProgress } from '../../services/boardApi';

function statusLabel(status: SeriesStatus): { text: string; className: string } {
  switch (status) {
    case 'In Progress':
      return { text: 'Đang xuất bản', className: 'text-blue-700 bg-blue-100 border-blue-200' };
    case 'Completed':
      return { text: 'Đã hoàn thành', className: 'text-teal-700 bg-teal-100 border-teal-200' };
    case 'Published':
      return { text: 'Đã xuất bản', className: 'text-slate-700 bg-slate-100 border-slate-200' };
    case 'Approved':
    default:
      return { text: 'Đã duyệt', className: 'text-green-700 bg-green-100 border-green-200' };
  }
}

export default function ApprovedSeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [series, setSeries] = useState<Series | null>(null);
  const [schedules, setSchedules] = useState<PublishingScheduleItem[]>([]);
  const [boardProgress, setBoardProgress] = useState<BoardVoteProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingLead, setClaimingLead] = useState(false);

  useEffect(() => {
    if (!seriesId) return;
    let isActive = true;
    setLoading(true);
    Promise.all([
      getSeries(seriesId),
      getSeriesSchedules(seriesId).catch(() => []),
      getBoardVoteProgress(seriesId).catch(() => null),
    ])
      .then(([s, sc, progress]) => {
        if (!isActive) return;
        setSeries(s);
        setSchedules(sc);
        setBoardProgress(progress);
        setPageMeta({
          title: s.title,
          breadcrumb: [
            { label: 'Series Đã Nhận', href: '/board/approved-series' },
            { label: s.title },
          ],
        });
      })
      .catch(err => {
        if (isActive) setError(err instanceof Error ? err.message : 'Không thể tải series.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [seriesId, setPageMeta]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  }

  if (!series) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{error || 'Không tìm thấy series.'}</p>
      </div>
    );
  }

  const badge = statusLabel(series.status);
  const latestSchedule = [...schedules].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  )[0];
  const canScheduleStatus = canSchedulePublishing(series.status);
  const canManageSchedule = canScheduleStatus && (boardProgress?.canManagePublishingSchedule ?? false);
  const canClaimLead = boardProgress?.canClaimLead ?? false;

  const handleClaimLead = async () => {
    if (!seriesId) return;
    setClaimingLead(true);
    setError('');
    try {
      await claimSeriesLead(seriesId);
      const progress = await getBoardVoteProgress(seriesId).catch(() => null);
      if (progress) setBoardProgress(progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhận phụ trách chính.');
    } finally {
      setClaimingLead(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="flex-1 min-w-0 lg:min-h-0 lg:overflow-y-auto p-6 space-y-5">
        <button
          type="button"
          onClick={() => navigate('/board/approved-series')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} /> Quay lại
        </button>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{series.title}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badge.className}`}>
            {badge.text}
          </span>
        </div>

        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <User size={14} />
          {series.mangakaName ?? '—'}
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin series</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Thể loại</p>
              <div className="flex flex-wrap gap-2">
                {series.genres.map(g => (
                  <Badge key={g} variant="outline">{g}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Tóm tắt</p>
              <p className="leading-relaxed text-foreground/85 whitespace-pre-wrap">
                {series.synopsis || '—'}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Đối tượng</p>
                <p>{series.targetAudience || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Lịch xuất bản</p>
                <PublishingTypeBadge type={series.publishingType === 'Monthly' ? 'Monthly' : 'Weekly'} />
              </div>
            </div>
            {series.mainCharacters && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Nhân vật chính</p>
                <p className="leading-relaxed whitespace-pre-wrap">{series.mainCharacters}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={16} />
              Lịch phát hành ({schedules.length})
            </CardTitle>
          </CardHeader>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lịch xuất bản.</p>
          ) : (
            <ul className="space-y-2">
              {schedules.map(s => (
                <li key={s.id} className="flex justify-between gap-3 text-sm border-b border-border pb-2 last:border-0">
                  <span>
                    Kỳ {s.issueNumber ?? '—'} · {s.publishDate}
                    {s.notes && <span className="block text-xs text-muted-foreground mt-0.5">{s.notes}</span>}
                  </span>
                  <PublishingTypeBadge type={s.frequency?.toLowerCase() === 'monthly' ? 'Monthly' : 'Weekly'} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <aside className="shrink-0 w-full lg:w-[min(360px,34vw)] border-t lg:border-t-0 lg:border-l border-border p-6 space-y-5 bg-background">
        <div className="rounded-2xl border border-border overflow-hidden aspect-[280/380] max-h-[420px]">
          <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thao tác</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {boardProgress?.hasLead && (
              <p className="text-xs text-muted-foreground">
                Phụ trách chính: <span className="font-semibold text-foreground">{boardProgress.leadBoardMemberName}</span>
                {boardProgress.currentUserIsLead && <span className="text-primary"> (bạn)</span>}
              </p>
            )}
            {canClaimLead && (
              <div className="rounded-xl border border-border px-3 py-3 space-y-2">
                <p className="text-sm font-semibold">Nhận làm phụ trách chính</p>
                <p className="text-xs text-muted-foreground">
                  Lên lịch xuất bản sau khi series hoàn thành.
                  {boardProgress?.leadClaimExpiresAt && (
                    <> Hạn: {new Date(boardProgress.leadClaimExpiresAt).toLocaleString('vi-VN')}.</>
                  )}
                </p>
                <Button className="w-full" disabled={claimingLead} onClick={handleClaimLead}>
                  {claimingLead ? 'Đang nhận...' : 'Nhận phụ trách chính'}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/board/approved-series/${series.id}/read`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Xem trang truyện
            </Button>
            {canManageSchedule ? (
              <Button className="w-full" onClick={() => navigate(`/board/publishing-schedule/${series.id}`)}>
                {schedules.length > 0 ? (
                  <>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Quản lý lịch xuất bản
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Lên lịch xuất bản
                  </>
                )}
              </Button>
            ) : canScheduleStatus ? (
              <p className="text-sm text-muted-foreground">
                Chỉ phụ trách chính được lên lịch. Bạn có thể xem lịch hiện có.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chờ editor đánh dấu hoàn thành sản xuất trước khi lên lịch xuất bản.
              </p>
            )}
            {canScheduleStatus && !canManageSchedule && schedules.length > 0 && (
              <Button variant="outline" className="w-full" onClick={() => navigate(`/board/publishing-schedule/${series.id}`)}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Xem lịch xuất bản
              </Button>
            )}
            {latestSchedule && (
              <p className="text-xs text-muted-foreground">
                Lịch gần nhất: kỳ {latestSchedule.issueNumber ?? '—'} · {latestSchedule.publishDate}
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate(`/board/submissions/${series.id}`)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Xem hồ sơ đề xuất
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}
