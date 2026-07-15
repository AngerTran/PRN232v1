import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Input } from '../../app/components/ui/input';
import { BoardMangaCard } from '../../app/components/ui/board/BoardMangaCard';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import type { Series } from '../../types/domain';
import { getVisibleSeries, getSeriesSchedules } from '../../services/seriesApi';
import { Search, CalendarDays, Inbox } from 'lucide-react';

type SeriesScheduleSummary = Series & {
  scheduleCount: number;
  nextPublishDate?: string;
  latestFrequency?: 'Weekly' | 'Monthly';
};

export default function PublishingSchedulePage() {
  usePageMeta({ title: 'Lịch Xuất Bản' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SeriesScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const list = await getVisibleSeries();
        const enriched = await Promise.all(
          list.map(async s => {
            const schedules = await getSeriesSchedules(s.id).catch(() => []);
            const sorted = [...schedules].sort(
              (a, b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
            );
            const upcoming = sorted.find(sc => new Date(sc.publishDate) >= new Date()) ?? sorted[sorted.length - 1];
            return {
              ...s,
              scheduleCount: schedules.length,
              nextPublishDate: upcoming?.publishDate,
              latestFrequency: upcoming
                ? upcoming.frequency?.toLowerCase() === 'monthly'
                  ? 'Monthly'
                  : 'Weekly'
                : undefined,
            } as SeriesScheduleSummary;
          })
        );
        const withSchedules = enriched.filter(s => s.scheduleCount > 0);
        if (isActive) setRows(withSchedules);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Không thể tải lịch xuất bản.');
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

  const totalSchedules = rows.reduce((sum, s) => sum + s.scheduleCount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lịch Xuất Bản</h1>
        <p className="text-muted-foreground mt-1">
          {loading
            ? 'Đang tải...'
            : `${rows.length} series · ${totalSchedules} lịch phát hành · nhấn thẻ để quản lý`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm series hoặc mangaka..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-muted/30 aspect-[3/5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Chưa có lịch xuất bản</p>
          <p className="text-sm text-muted-foreground mt-1">
            Lên lịch từ Series Đã Nhận khi series đã được hội đồng phê duyệt.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(series => (
            <BoardMangaCard
              key={series.id}
              seriesId={series.id}
              title={series.title}
              coverUrl={series.coverUrl}
              mangakaName={series.mangakaName}
              genre={series.genre}
              synopsis={series.synopsis}
              badge={
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/90 text-primary-foreground">
                  {series.scheduleCount} kỳ
                </span>
              }
              to={`/board/publishing-schedule/${series.id}`}
              meta={
                <div className="space-y-2 text-xs">
                  {series.latestFrequency && (
                    <PublishingTypeBadge type={series.latestFrequency} />
                  )}
                  {series.nextPublishDate && (
                    <p className="text-muted-foreground inline-flex items-center gap-1">
                      <CalendarDays size={12} />
                      Kỳ gần nhất: {series.nextPublishDate}
                    </p>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
