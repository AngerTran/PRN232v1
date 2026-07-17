import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import Badge from '../../components/ui/Badge';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import { BoardMangaCard } from '../../app/components/ui/board/BoardMangaCard';
import type { Series } from '../../types/domain';
import { getApprovedSeries, getSeriesChapters, getSeriesSchedules, canSchedulePublishing } from '../../services/seriesApi';
import { getBoardVoteProgress } from '../../services/boardApi';
import { Search, CalendarDays, CalendarPlus, Inbox } from 'lucide-react';

type ApprovedRow = Series & {
  scheduleType: 'Weekly' | 'Monthly' | null;
  hasSchedule: boolean;
  scheduleCount: number;
  canManagePublishingSchedule: boolean;
  /** Chương sản xuất (số > 0), không tính bản thảo đề xuất. */
  productionChapterCount: number;
};

const SERIES_GRID_CLASS =
  'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

export default function BoardApprovedSeriesPage() {
  usePageMeta({ title: 'Series Đã Nhận' });
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
            const [schedules, progress, chapters] = await Promise.all([
              getSeriesSchedules(series.id).catch(() => []),
              getBoardVoteProgress(series.id).catch(() => null),
              getSeriesChapters(series.id).catch(() => []),
            ]);
            const latest = schedules.sort(
              (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
            )[0];
            const productionChapterCount = chapters.filter(
              c => c.number > 0 && (c.status === 'Approved' || c.status === 'Published')
            ).length;
            return {
              ...series,
              chaptersCount: productionChapterCount,
              scheduleType: latest
                ? latest.frequency?.toLowerCase() === 'monthly'
                  ? 'Monthly'
                  : 'Weekly'
                : null,
              hasSchedule: schedules.length > 0,
              scheduleCount: schedules.length,
              canManagePublishingSchedule: progress?.canManagePublishingSchedule ?? false,
              productionChapterCount,
            } as ApprovedRow;
          })
        );
        if (isActive) {
          setRows(enriched);
        }
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

  const matchesSearch = (title: string, mangaka?: string, genre?: string, synopsis?: string) => {
    const q = search.toLowerCase();
    return (
      title.toLowerCase().includes(q) ||
      (mangaka ?? '').toLowerCase().includes(q) ||
      (genre ?? '').toLowerCase().includes(q) ||
      (synopsis ?? '').toLowerCase().includes(q)
    );
  };

  const filtered = rows.filter(s =>
    matchesSearch(s.title, s.mangakaName, s.genre, s.synopsis)
  );

  const renderSeriesFooter = (series: ApprovedRow): ReactNode => {
    if (series.status === 'At Risk') {
      return (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={e => {
            e.stopPropagation();
            navigate('/board/series-decisions');
          }}
        >
          Xem quyết định
        </Button>
      );
    }

    if (canSchedulePublishing(series.status) && series.canManagePublishingSchedule) {
      return (
        <div className="w-full">
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={e => {
              e.stopPropagation();
              navigate(`/board/publishing-schedule/${series.id}`);
            }}
          >
            {series.hasSchedule ? (
              <>
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                Quản lý lịch
              </>
            ) : (
              <>
                <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                Lên lịch xuất bản
              </>
            )}
          </Button>
        </div>
      );
    }

    if (canSchedulePublishing(series.status)) {
      return (
        <p className="text-xs text-muted-foreground text-center">
          {series.productionChapterCount > 0
            ? `${series.productionChapterCount} chương — chỉ Lead lên lịch`
            : 'Chờ mangaka tạo chương · chỉ Lead lên lịch'}
        </p>
      );
    }

    return <p className="text-xs text-muted-foreground">Theo dõi tiến độ</p>;
  };

  const renderSeriesPanel = (series: ApprovedRow) => {
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
        to={`/board/approved-series/${series.id}`}
        badge={<Badge status={series.status} size="sm" variant="overlay" />}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {publishType && (
              <PublishingTypeBadge type={publishType === 'Monthly' ? 'Monthly' : 'Weekly'} />
            )}
            {series.productionChapterCount > 0 && (
              <span className="text-muted-foreground">{series.productionChapterCount} chương</span>
            )}
            {series.scheduleCount > 0 && (
              <span className="text-muted-foreground">{series.scheduleCount} lịch</span>
            )}
          </div>
        }
        footer={renderSeriesFooter(series)}
      />
    );
  };

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Series đã nhận</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Series board đã nhận — xem trạng thái trên từng thẻ để theo dõi.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Tìm series, mangaka…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className={SERIES_GRID_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-muted/30 aspect-[3/5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Không có series</p>
        </div>
      ) : (
        <div className={SERIES_GRID_CLASS}>{filtered.map(renderSeriesPanel)}</div>
      )}
    </div>
  );
}
