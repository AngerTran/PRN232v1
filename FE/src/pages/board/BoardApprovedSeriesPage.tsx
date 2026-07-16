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

type BucketId = 'waiting' | 'production' | 'at-risk' | 'closed';

type BucketSection = {
  id: BucketId;
  title: string;
  description: string;
  emptyHint: string;
};

/**
 * Nhóm theo thực tế sản xuất, không chỉ theo status DB cứng.
 * Trước đây "Đang sản xuất" = status publishing — nhưng tạo chương không đổi status
 * nên series vẫn kẹt ở "Chờ bắt đầu" dù đã có chương.
 */
const BUCKETS: BucketSection[] = [
  {
    id: 'waiting',
    title: 'Chưa có chương sản xuất',
    description: 'Đã duyệt nhưng chưa tạo chương > 0 — Lead vẫn có thể lên lịch XB',
    emptyHint: 'Không có series chờ tạo chương',
  },
  {
    id: 'production',
    title: 'Đang sản xuất',
    description: 'Đã có chương / đang làm — Lead lên hoặc dời lịch XB khi cần',
    emptyHint: 'Không có series đang sản xuất',
  },
  {
    id: 'at-risk',
    title: 'Cần theo dõi',
    description: 'Tạm dừng hoặc nguy cơ xếp hạng — cần quyết định',
    emptyHint: 'Không có series cần theo dõi',
  },
  {
    id: 'closed',
    title: 'Sẵn sàng XB',
    description: 'Editor đã báo Lead — vẫn dời lịch / làm thêm chương khi cần',
    emptyHint: 'Chưa có series được báo sẵn sàng xuất bản',
  },
];

function bucketFor(series: ApprovedRow): BucketId {
  if (series.status === 'Completed') return 'closed';
  if (series.status === 'At Risk') return 'at-risk';
  if (series.productionChapterCount > 0 || series.status === 'In Progress') return 'production';
  return 'waiting';
}

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

  const sectionsWithItems = useMemo(
    () =>
      BUCKETS.map(section => ({
        ...section,
        items: filtered.filter(s => bucketFor(s) === section.id),
      })),
    [filtered]
  );

  useEffect(() => {
    if (loading || defaultsSet) return;
    setOpenSections(sectionsWithItems.filter(s => s.items.length > 0).map(s => s.id));
    setDefaultsSet(true);
  }, [loading, defaultsSet, sectionsWithItems]);

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
        <div className="space-y-1.5 w-full">
          <p className="text-[11px] text-muted-foreground text-center">
            {series.productionChapterCount > 0
              ? `${series.productionChapterCount} chương · ${series.scheduleCount} lịch`
              : 'Chưa có chương sản xuất'}
          </p>
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
            {series.productionChapterCount > 0 && (
              <span className="text-[11px] text-muted-foreground">{series.productionChapterCount} chương</span>
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
        <h1 className="text-2xl font-bold tracking-tight">Series đã nhận</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nhóm theo tiến độ thật (đã có chương hay chưa), không chỉ theo nhãn status cứng.
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
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Không có series</p>
        </div>
      ) : (
        <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-3">
          {sectionsWithItems.map(section => (
            <AccordionItem key={section.id} value={section.id} className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-start gap-3 text-left pr-2">
                  <CountBadge count={section.items.length} />
                  <div>
                    <p className="font-semibold">{section.title}</p>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">{section.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground pb-3">{section.emptyHint}</p>
                ) : (
                  <div className={`${SERIES_GRID_CLASS} pb-3`}>{section.items.map(renderSeriesPanel)}</div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
