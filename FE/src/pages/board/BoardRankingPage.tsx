import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { getLeaderboard, listRankingIssues, type LeaderboardItem } from '../../services/boardApi';
import { getVisibleSeries } from '../../services/seriesApi';
import { formatPublishingIssueLabel } from '../../utils/publishingIssue';
import {
  Trophy,
  BarChart3,
  Star,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarRange,
  SlidersHorizontal,
  Crown,
} from 'lucide-react';
import { clsx } from 'clsx';

type Metric = 'votes' | 'popularity' | 'rank';
type ViewMode = 'latest' | 'issue';

const METRIC_LABEL: Record<Metric, string> = {
  votes: 'Theo Vote',
  popularity: 'Theo Độ Phổ Biến',
  rank: 'Theo Xếp Hạng',
};

interface SeriesMeta {
  mangakaName?: string;
  isAtRisk: boolean;
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  iconClass,
  className,
  action,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
  iconClass: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={clsx('gap-0 overflow-hidden shadow-sm', className)}>
      <CardContent className="flex h-full items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight">{value}</p>
          {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
          {action}
        </div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BoardRankingPage() {
  usePageMeta({ title: 'Bảng Xếp Hạng' });
  const navigate = useNavigate();
  const [metric, setMetric] = useState<Metric>('rank');
  const [viewMode, setViewMode] = useState<ViewMode>('latest');
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [issueOptions, setIssueOptions] = useState<number[]>([]);
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [metaById, setMetaById] = useState<Map<string, SeriesMeta>>(new Map());
  const [prevRankById, setPrevRankById] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listRankingIssues()
      .then(issues => setIssueOptions(issues))
      .catch(() => setIssueOptions([]));
  }, []);

  useEffect(() => {
    getVisibleSeries()
      .then(list => {
        const map = new Map<string, SeriesMeta>();
        list.forEach(s => {
          map.set(s.id, { mangakaName: s.mangakaName, isAtRisk: s.isAtRisk });
        });
        setMetaById(map);
      })
      .catch(() => setMetaById(new Map()));
  }, []);

  useEffect(() => {
    if (viewMode !== 'latest' || issueOptions.length < 2) {
      setPrevRankById(new Map());
      return;
    }
    const sorted = [...issueOptions].sort((a, b) => b - a);
    const prevIssue = sorted[1];
    getLeaderboard('rank', prevIssue)
      .then(list => {
        const map = new Map<string, number>();
        list.forEach(i => {
          if (i.latestRank != null) map.set(i.seriesId, i.latestRank);
        });
        setPrevRankById(map);
      })
      .catch(() => setPrevRankById(new Map()));
  }, [viewMode, issueOptions]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError('');
    const issue = viewMode === 'issue' ? issueNumber ?? undefined : undefined;
    getLeaderboard(metric, issue)
      .then(list => {
        if (isActive) setItems(list);
      })
      .catch(err => {
        if (isActive) setError(err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [metric, viewMode, issueNumber]);

  const atRiskCount = useMemo(
    () => items.filter(i => metaById.get(i.seriesId)?.isAtRisk).length,
    [items, metaById]
  );

  const topSeries = items[0];
  const totalVotes = items.reduce((sum, i) => sum + i.totalVotes, 0);

  return (
    <div className="w-full min-w-0 space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Bảng Xếp Hạng Series</h1>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {viewMode === 'issue' && issueNumber != null
                ? formatPublishingIssueLabel(issueNumber)
                : 'Kỳ mới nhất'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            So sánh thứ hạng, lượt vote và độ phổ biến của các series.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/board/vote-input')}>
          Nhập kết quả vote
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Series dẫn đầu"
          value={topSeries?.title ?? '—'}
          detail={topSeries ? `${topSeries.totalVotes.toLocaleString()} vote` : 'Chưa có dữ liệu'}
          icon={<Crown className="h-5 w-5" />}
          iconClass="bg-amber-100 text-amber-700"
        />
        <SummaryCard
          label="Series được xếp hạng"
          value={items.length.toLocaleString()}
          detail="Trong phạm vi đang xem"
          icon={<BarChart3 className="h-5 w-5" />}
          iconClass="bg-violet-100 text-violet-700"
        />
        <SummaryCard
          label="Tổng lượt vote"
          value={totalVotes.toLocaleString()}
          detail="Tổng vote của bảng hiện tại"
          icon={<Star className="h-5 w-5" />}
          iconClass="bg-emerald-100 text-emerald-700"
        />
        <SummaryCard
          label="Series cần theo dõi"
          value={atRiskCount.toLocaleString()}
          detail={atRiskCount > 0 ? 'Cần hội đồng xem xét' : 'Không có cảnh báo'}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClass={atRiskCount > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}
          className={atRiskCount > 0 ? 'border-red-200 bg-red-50/40' : undefined}
          action={
            atRiskCount > 0 ? (
              <Button
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-xs text-red-700"
                onClick={() => navigate('/board/series-decisions')}
              >
                Xem quyết định
              </Button>
            ) : undefined
          }
        />
      </div>

      <Card className="gap-0 overflow-visible shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Phạm vi dữ liệu</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant={viewMode === 'latest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('latest')}
                  >
                    Kỳ mới nhất
                  </Button>
                  <Button
                    variant={viewMode === 'issue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setViewMode('issue');
                      if (issueNumber == null && issueOptions.length > 0) {
                        setIssueNumber(issueOptions[0]);
                      }
                    }}
                  >
                    Chọn theo kỳ
                  </Button>
                  {viewMode === 'issue' && (
                    <Select
                      value={issueNumber != null ? String(issueNumber) : undefined}
                      onValueChange={v => setIssueNumber(Number(v))}
                    >
                      <SelectTrigger className="h-9 w-[240px]">
                        <CalendarRange className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Chọn kỳ" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueOptions.map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {formatPublishingIssueLabel(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:border-l lg:pl-5">
              <p className="text-sm font-semibold">Sắp xếp theo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['rank', 'votes', 'popularity'] as const).map(f => (
                  <Button
                    key={f}
                    variant={metric === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMetric(f)}
                  >
                    {METRIC_LABEL[f]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold">Xếp hạng chi tiết</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? 'Đang tải dữ liệu…' : `${items.length} series trong bảng hiện tại`}
            </p>
          </div>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {METRIC_LABEL[metric]}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/35">
              <tr>
                <th className="w-24 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hạng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Series</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mangaka</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vote</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phổ biến</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Xu hướng</th>
                <th className="w-28 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">Đang tải bảng xếp hạng…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-destructive">{error}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">Chưa có dữ liệu xếp hạng</td>
                </tr>
              ) : (
                items.map((r, idx) => {
                  const rank = r.latestRank ?? idx + 1;
                  const meta = metaById.get(r.seriesId);
                  const prevRank = prevRankById.get(r.seriesId);
                  const delta = prevRank != null ? prevRank - rank : 0;
                  const atRisk = meta?.isAtRisk ?? false;

                  return (
                    <tr
                      key={r.seriesId}
                      className={clsx(
                        'transition-colors hover:bg-muted/30',
                        atRisk && 'bg-red-50/60'
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className={clsx(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold',
                          rank === 1 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' :
                          rank === 2 ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' :
                          rank === 3 ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' :
                          'bg-muted text-muted-foreground'
                        )}>
                          #{rank}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.title}</span>
                          {atRisk && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                              Nguy cơ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{meta?.mangakaName ?? '—'}</td>
                      <td className="px-4 py-4 text-right font-mono font-semibold">{r.totalVotes.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-mono">{r.popularityScore.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1 text-xs">
                          {prevRank == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : delta > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-600">+{delta}</span>
                            </>
                          ) : delta < 0 ? (
                            <>
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              <span className="font-semibold text-red-600">{delta}</span>
                            </>
                          ) : (
                            <>
                              <Minus className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">0</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {atRisk && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/board/series-decisions/${r.seriesId}`)}>
                              Quyết định
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Xem series"
                            onClick={() => navigate(`/board/approved-series/${r.seriesId}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
