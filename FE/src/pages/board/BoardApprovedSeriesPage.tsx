import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import { BoardMangaCard } from '../../app/components/ui/board/BoardMangaCard';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import type { Series, SeriesStatus } from '../../types/domain';
import { getApprovedSeries, getSeriesSchedules, canSchedulePublishing } from '../../services/seriesApi';
import { Search, CalendarDays, CalendarPlus, Inbox } from 'lucide-react';

type ApprovedRow = Series & {
  scheduleType: 'Weekly' | 'Monthly' | null;
  hasSchedule: boolean;
  scheduleCount: number;
};

function statusBadge(status: SeriesStatus) {
  switch (status) {
    case 'In Progress':
      return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Đang xuất bản</span>;
    case 'Completed':
      return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200">Đã hoàn thành</span>;
    case 'Published':
      return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">Đã xuất bản</span>;
    default:
      return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">Đã duyệt</span>;
  }
}

export default function BoardApprovedSeriesPage() {
  usePageMeta({ title: 'Series Đã Duyệt' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ApprovedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const list = await getApprovedSeries();
        const enriched = await Promise.all(
          list.map(async series => {
            const schedules = await getSeriesSchedules(series.id).catch(() => []);
            const latest = schedules.sort(
              (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
            )[0];
            return {
              ...series,
              scheduleType: latest
                ? latest.frequency?.toLowerCase() === 'monthly'
                  ? 'Monthly'
                  : 'Weekly'
                : null,
              hasSchedule: schedules.length > 0,
              scheduleCount: schedules.length,
            } as ApprovedRow;
          })
        );
        if (isActive) setRows(enriched);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách.');
          setRows([]);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }
    load();
    return () => {
      isActive = false;
    };
  }, []);

  const filtered = rows.filter(
    s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.mangakaName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Series Đã Được Phê Duyệt</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? 'Đang tải...' : `${rows.length} series · nhấn thẻ để xem chi tiết`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên series hoặc mangaka..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-muted/30 aspect-[3/5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Không có series phù hợp</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(series => {
            const publishType = series.scheduleType ?? series.publishingType;
            return (
              <BoardMangaCard
                key={series.id}
                seriesId={series.id}
                title={series.title}
                coverUrl={series.coverUrl}
                mangakaName={series.mangakaName}
                genre={series.genre}
                synopsis={series.synopsis}
                badge={statusBadge(series.status)}
                to={`/board/approved-series/${series.id}`}
                meta={
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {publishType && (
                      <PublishingTypeBadge type={publishType === 'Monthly' ? 'Monthly' : 'Weekly'} />
                    )}
                    <span className="text-muted-foreground">
                      {series.scheduleCount > 0 ? `${series.scheduleCount} lịch` : 'Chưa lên lịch'}
                    </span>
                  </div>
                }
                footer={
                  canSchedulePublishing(series.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/board/publishing-schedule/${series.id}`);
                      }}
                    >
                      {series.hasSchedule ? (
                        <>
                          <CalendarDays className="h-3.5 w-3.5 mr-1" />
                          Xem lịch
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                          Lên lịch
                        </>
                      )}
                    </Button>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">Chờ hoàn thành sản xuất</p>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
