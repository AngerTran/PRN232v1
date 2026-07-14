import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import type { Series } from '../../types/domain';
import { getVisibleSeries, getSeries } from '../../services/seriesApi';
import { getPendingSeries, getLeaderboard, type PendingSeriesItem, type LeaderboardItem } from '../../services/boardApi';
import { getStoredUser } from '../../services/authApi';
import { BoardMangaCard } from '../../app/components/ui/board/BoardMangaCard';
import {
  FileText, Star, CalendarDays, AlertTriangle, ArrowRight, Gavel, Trophy, Clock3,
} from 'lucide-react';
import { clsx } from 'clsx';

const PREVIEW_LIMIT = 4;

type EnrichedPending = PendingSeriesItem & { series: Series | null };

function SeriesSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate(href)} className="text-primary">
          Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,168px))]">
        {children}
      </div>
    </section>
  );
}

export default function BoardDashboardPage() {
  usePageMeta({ title: 'Board Dashboard' });
  const navigate = useNavigate();
  const boardName = getStoredUser()?.name ?? 'Hội đồng';

  const [series, setSeries] = useState<Series[]>([]);
  const [pending, setPending] = useState<EnrichedPending[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    Promise.all([
      getVisibleSeries().catch(() => [] as Series[]),
      getPendingSeries().catch(() => [] as PendingSeriesItem[]),
      getLeaderboard('rank').catch(() => [] as LeaderboardItem[]),
    ]).then(async ([s, p, l]) => {
      if (!isActive) return;
      const enriched = await Promise.all(
        p.map(async item => {
          const detail = await getSeries(item.id).catch(() => null);
          return { ...item, series: detail };
        }),
      );
      if (!isActive) return;
      setSeries(s);
      setPending(enriched);
      setLeaderboard(l);
    }).finally(() => {
      if (isActive) setLoading(false);
    });
    return () => {
      isActive = false;
    };
  }, []);

  const approvedSeries = series.filter(s => s.status === 'Approved');
  const publishingSeries = series.filter(s => s.status === 'In Progress' || s.status === 'Published');
  const atRiskSeries = series.filter(s => s.isAtRisk);
  const pendingTop = pending.slice(0, PREVIEW_LIMIT);
  const approvedTop = approvedSeries.slice(0, PREVIEW_LIMIT);
  const publishingTop = publishingSeries.slice(0, PREVIEW_LIMIT);
  const atRiskTop = atRiskSeries.slice(0, PREVIEW_LIMIT);
  const topRanked = leaderboard.slice(0, 5);

  const hasAnySeriesContent =
    pendingTop.length > 0
    || approvedTop.length > 0
    || publishingTop.length > 0
    || atRiskTop.length > 0
    || topRanked.length > 0;

  const summaryParts: string[] = [];
  if (pending.length > 0) summaryParts.push(`${pending.length} chờ duyệt`);
  if (approvedSeries.length > 0) summaryParts.push(`${approvedSeries.length} đã nhận`);
  if (publishingSeries.length > 0) summaryParts.push(`${publishingSeries.length} xuất bản`);
  if (atRiskSeries.length > 0) summaryParts.push(`${atRiskSeries.length} At Risk`);

  const shortcuts = [
    {
      label: 'Chờ duyệt',
      value: pending.length,
      icon: <FileText className="h-4 w-4" />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/board/submissions',
    },
    {
      label: 'Đã nhận',
      value: approvedSeries.length,
      icon: <Star className="h-4 w-4" />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/board/approved-series',
    },
    {
      label: 'Xuất bản',
      value: publishingSeries.length,
      icon: <CalendarDays className="h-4 w-4" />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      href: '/board/publishing-schedule',
    },
    {
      label: 'At Risk',
      value: atRiskSeries.length,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      bg: 'bg-red-50',
      href: '/board/series-decisions',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Hội đồng biên tập</p>
          <h1 className="text-2xl font-bold">Xin chào, {boardName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? 'Đang tải...'
              : summaryParts.length > 0
                ? summaryParts.join(' · ')
                : 'Chưa có series trong các mục theo dõi.'}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/board/submissions')}>
          <Gavel className="h-4 w-4 mr-1.5" />
          Duyệt Series
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {shortcuts.map(card => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.href)}
            className="text-left rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className={clsx('p-1.5 rounded-lg', card.bg)}>
                <span className={card.color}>{card.icon}</span>
              </div>
            </div>
            <p className="text-2xl font-bold">{loading ? '—' : card.value}</p>
          </button>
        ))}
      </div>

      {pendingTop.length > 0 && (
        <SeriesSection title="Cần bỏ phiếu" href="/board/submissions">
          {pendingTop.map(sub => (
            <BoardMangaCard
              key={sub.id}
              seriesId={sub.id}
              title={sub.title}
              coverUrl={sub.series?.coverUrl}
              mangakaName={sub.authorName ?? sub.series?.mangakaName}
              genre={sub.series?.genre}
              badge={
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-600/90 text-white">
                  Chờ duyệt
                </span>
              }
              to={`/board/submissions/${sub.id}`}
              meta={
                sub.reviewExpiresAt ? (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    Hạn: {new Date(sub.reviewExpiresAt).toLocaleString('vi-VN')}
                  </p>
                ) : undefined
              }
            />
          ))}
        </SeriesSection>
      )}

      {approvedTop.length > 0 && (
        <SeriesSection title="Đã nhận" href="/board/approved-series">
          {approvedTop.map(s => (
            <BoardMangaCard
              key={s.id}
              seriesId={s.id}
              title={s.title}
              coverUrl={s.coverUrl}
              mangakaName={s.mangakaName}
              genre={s.genre}
              badge={
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-600/90 text-white">
                  Đã nhận
                </span>
              }
              to={`/board/approved-series/${s.id}`}
            />
          ))}
        </SeriesSection>
      )}

      {publishingTop.length > 0 && (
        <SeriesSection title="Xuất bản" href="/board/publishing-schedule">
          {publishingTop.map(s => (
            <BoardMangaCard
              key={s.id}
              seriesId={s.id}
              title={s.title}
              coverUrl={s.coverUrl}
              mangakaName={s.mangakaName}
              genre={s.genre}
              badge={
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-violet-600/90 text-white">
                  {s.status === 'Published' ? 'Đã XB' : 'Sản xuất'}
                </span>
              }
              to={`/board/approved-series/${s.id}`}
            />
          ))}
        </SeriesSection>
      )}

      {atRiskTop.length > 0 && (
        <SeriesSection title="At Risk" href="/board/series-decisions">
          {atRiskTop.map(s => (
            <BoardMangaCard
              key={s.id}
              seriesId={s.id}
              title={s.title}
              coverUrl={s.coverUrl}
              mangakaName={s.mangakaName}
              genre={s.genre}
              badge={
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-600/90 text-white">
                  At Risk
                </span>
              }
              to="/board/series-decisions"
            />
          ))}
        </SeriesSection>
      )}

      {topRanked.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top xếp hạng</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/board/rankings')} className="text-primary">
              Bảng xếp hạng <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {topRanked.map((r, idx) => (
                <div key={r.seriesId} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                      #{r.latestRank ?? idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.totalVotes.toLocaleString()} votes</p>
                    </div>
                  </div>
                  <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {!loading && !hasAnySeriesContent && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chưa có series nào để hiển thị. Dùng các ô thống kê phía trên để mở từng mục.
        </p>
      )}
    </div>
  );
}
