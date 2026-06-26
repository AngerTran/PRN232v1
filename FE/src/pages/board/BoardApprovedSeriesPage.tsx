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
import { getApprovedSeries, getSeries, getSeriesSchedules, canSchedulePublishing } from '../../services/seriesApi';
import { getInReviewSeries, getBoardVoteProgress, type PendingSeriesItem } from '../../services/boardApi';
import { Search, CalendarDays, CalendarPlus, Inbox } from 'lucide-react';

type ApprovedRow = Series & {
  scheduleType: 'Weekly' | 'Monthly' | null;
  hasSchedule: boolean;
  scheduleCount: number;
  canManagePublishingSchedule: boolean;
};

type InReviewRow = PendingSeriesItem & { series: Series | null };

type StatusSection = {
  id: string;
  title: string;
  description: string;
  statuses: SeriesStatus[];
  emptyHint: string;
};

const IN_REVIEW_SECTION = {
  id: 'in-review',
  title: 'Đang phê duyệt',
  description: 'Đủ reviewer — chờ hội đồng bỏ phiếu',
  emptyHint: 'Không có series đang phê duyệt',
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
    description: 'Editor hoàn thành — lead lên lịch xuất bản',
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
  const [inReviewRows, setInReviewRows] = useState<InReviewRow[]>([]);
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
        const [list, inReview] = await Promise.all([getApprovedSeries(), getInReviewSeries()]);
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
              canManagePublishingSchedule: progress?.canManagePublishingSchedule ?? true,
            } as ApprovedRow;
          })
        );
        const enrichedInReview = await Promise.all(
          inReview.map(async item => {
            const series = await getSeries(item.id).catch(() => null);
            return { ...item, series };
          })
        );
        if (isActive) {
          setRows(enriched);
          setInReviewRows(enrichedInReview);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách.');
          setRows([]);
          setInReviewRows([]);
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

  const filteredInReview = inReviewRows.filter(item =>
    matchesSearch(item.title, item.authorName, item.series?.genre, item.series?.synopsis)
  );

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

  const totalCount = rows.length + inReviewRows.length;

  useEffect(() => {
    if (loading || defaultsSet) return;
    const defaults = [
      ...(filteredInReview.length > 0 ? [IN_REVIEW_SECTION.id] : []),
      ...sectionsWithItems.filter(s => s.items.length > 0).map(s => s.id),
    ];
    setOpenSections(defaults);
    setDefaultsSet(true);
  }, [loading, defaultsSet, filteredInReview.length, sectionsWithItems]);

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
      return <p className="text-xs text-muted-foreground">Chỉ phụ trách chính lên lịch</p>;
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

  const renderInReviewPanel = (item: InReviewRow) => (
    <BoardSeriesPanelCard
      key={item.id}
      seriesId={item.id}
      title={item.title}
      coverUrl={item.series?.coverUrl}
      mangakaName={item.authorName ?? item.series?.mangakaName}
      to={`/board/submissions/${item.id}`}
      meta={
        <>
          <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {item.claimedBoardMembers}/{item.requiredClaims} reviewer
          </span>
          <span className="text-[11px] text-muted-foreground">
            {item.votedBoardMembers}/3 phiếu
          </span>
        </>
      }
      footer={
        <p className="text-xs text-muted-foreground">
          {item.currentUserHasClaimed ? 'Bạn đã nhận — bỏ phiếu' : 'Nhấn để xem hồ sơ'}
        </p>
      }
    />
  );

  const accordionSections = [
    { ...IN_REVIEW_SECTION, items: filteredInReview },
    ...sectionsWithItems,
  ];

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold">Series Đã Nhận</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading ? 'Đang tải...' : `${totalCount} series · mở từng mục để xem chi tiết`}
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : totalCount === 0 && !search ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <Inbox className="h-9 w-9 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium text-sm">Chưa có series trong danh sách</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="w-full rounded-2xl border border-border bg-card px-4"
        >
          {accordionSections.map(section => {
            const count = section.items.length;
            return (
              <AccordionItem key={section.id} value={section.id} className="border-border">
                <AccordionTrigger className="hover:no-underline py-3.5">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-2 min-w-0">
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{section.title}</span>
                        <CountBadge count={count} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 hidden sm:block">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {count === 0 ? (
                    <p className="text-xs text-muted-foreground px-1 py-2">{section.emptyHint}</p>
                  ) : (
                    <div className={SERIES_GRID_CLASS}>
                      {section.id === 'in-review'
                        ? (section.items as InReviewRow[]).map(renderInReviewPanel)
                        : (section.items as ApprovedRow[]).map(renderSeriesPanel)}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
