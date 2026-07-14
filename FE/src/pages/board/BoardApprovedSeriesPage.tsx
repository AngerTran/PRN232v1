import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../app/components/ui/accordion';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import { BoardSeriesPanelCard } from '../../app/components/ui/board/BoardSeriesPanelCard';
import type { Series, SeriesStatus } from '../../types/domain';
import { getApprovedSeries, getSeriesSchedules, canSchedulePublishing } from '../../services/seriesApi';
import { getBoardVoteProgress } from '../../services/boardApi';
import { Search, CalendarDays, CalendarPlus, Inbox } from 'lucide-react';

type ApprovedRow = Series & {
  scheduleType: 'Weekly' | 'Monthly' | null;
  hasSchedule: boolean;
  scheduleCount: number;
  canManagePublishingSchedule: boolean;
};

type StatusSection = {
  id: string;
  title: string;
  description: string;
  statuses: SeriesStatus[];
  emptyHint: string;
};

const POST_REVIEW_SECTIONS: StatusSection[] = [
  {
    id: 'approved',
    title: 'Chờ bắt đầu sản xuất',
    description: 'Đã qua hội đồng — mangaka và editor triển khai',
    statuses: ['Approved'],
    emptyHint: 'Không có series chờ sản xuất',
  },
  {
    id: 'production',
    title: 'Đang sản xuất',
    description: 'Đang sản xuất chapter',
    statuses: ['In Progress'],
    emptyHint: 'Không có series đang sản xuất',
  },
  {
    id: 'at-risk',
    title: 'Cần theo dõi',
    description: 'Tạm dừng hoặc nguy cơ — cần quyết định',
    statuses: ['At Risk'],
    emptyHint: 'Không có series cần theo dõi',
  },
  {
    id: 'ready-schedule',
    title: 'Sẵn sàng lên lịch',
    description: 'Editor hoàn thành — Lead lên lịch xuất bản',
    statuses: ['Completed'],
    emptyHint: 'Không có series sẵn sàng lên lịch',
  },
];

function CountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant={count > 0 ? 'default' : 'secondary'}
      className={count > 0 ? 'bg-primary/10 text-primary border-primary/20' : ''}
    >
      {count}
    </Badge>
  );
}

const SERIES_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 pt-1';

export default function BoardApprovedSeriesPage() {
  usePageMeta({ title: 'Series Đã Nhận' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ApprovedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [defaultsSet, setDefaultsSet] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const list = await getApprovedSeries();
        const enriched = await Promise.all(
          list.map(async series => {
            const [schedules, progress] = await Promise.all([
              getSeriesSchedules(series.id).catch(() => []),
              getBoardVoteProgress(series.id).catch(() => null),
            ]);
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
              canManagePublishingSchedule: progress?.canManagePublishingSchedule ?? false,
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

  const sectionsWithItems = useMemo(
    () =>
      POST_REVIEW_SECTIONS.map(section => ({
        ...section,
        items: filtered.filter(s => section.statuses.includes(s.status)),
      })),
    [filtered]
  );

  useEffect(() => {
    if (loading || defaultsSet) return;
    setOpenSections(sectionsWithItems.filter(s => s.items.length > 0).map(s => s.id));
    setDefaultsSet(true);
  }, [loading, defaultsSet, sectionsWithItems]);

  const renderSeriesFooter = (series: ApprovedRow): ReactNode => {
    if (series.status === 'Approved') {
      return <p className="text-xs text-muted-foreground">Chờ mangaka / editor bắt đầu</p>;
    }
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
      );
    }
    if (canSchedulePublishing(series.status)) {
      return <p className="text-xs text-muted-foreground">Chỉ Lead được lên lịch (Admin gán)</p>;
    }
    if (series.status === 'In Progress') {
      return (
        <p className="text-xs text-muted-foreground">
          {series.scheduleCount > 0 ? `${series.scheduleCount} lịch đã lên` : 'Đang sản xuất nội dung'}
        </p>
      );
    }
    return <p className="text-xs text-muted-foreground">Theo dõi tiến độ</p>;
  };

  const renderSeriesPanel = (series: ApprovedRow) => {
    const publishType = series.scheduleType ?? series.publishingType;
    return (
      <BoardSeriesPanelCard
        key={series.id}
        seriesId={series.id}
        title={series.title}
        coverUrl={series.coverUrl}
        mangakaName={series.mangakaName}
        to={`/board/approved-series/${series.id}`}
        meta={
          <>
            {publishType && (
              <PublishingTypeBadge type={publishType === 'Monthly' ? 'Monthly' : 'Weekly'} />
            )}
            {series.scheduleCount > 0 && (
              <span className="text-[11px] text-muted-foreground">{series.scheduleCount} lịch</span>
            )}
          </>
        }
        footer={renderSeriesFooter(series)}
      />
    );
  };

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold">Series Đã Nhận</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading
            ? 'Đang tải...'
            : `${rows.length} series đã duyệt · series chờ phiếu nằm ở Duyệt Series`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên, mangaka, thể loại..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Chưa có series đã duyệt</p>
          <p className="text-sm text-muted-foreground mt-1">
            Series chờ xét duyệt xem tại mục Duyệt Series.
          </p>
        </div>
      ) : (
        <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
          {sectionsWithItems.map(section => (
            <AccordionItem key={section.id} value={section.id} className="border border-border rounded-xl px-4">
              <AccordionTrigger className="hover:no-underline py-3.5">
                <div className="flex items-center gap-3 text-left">
                  <span className="font-semibold">{section.title}</span>
                  <CountBadge count={section.items.length} />
                  <span className="text-xs text-muted-foreground font-normal hidden sm:inline">
                    {section.description}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground pb-2">{section.emptyHint}</p>
                ) : (
                  <div className={SERIES_GRID_CLASS}>{section.items.map(renderSeriesPanel)}</div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
