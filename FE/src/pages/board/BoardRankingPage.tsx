import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { getLeaderboard, listRankingIssues, type LeaderboardItem } from '../../services/boardApi';
import { getVisibleSeries } from '../../services/seriesApi';
import { Trophy, BarChart3, Star, Eye, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bảng Xếp Hạng Series</h1>
        <p className="text-muted-foreground mt-1">
          {viewMode === 'issue' && issueNumber != null
            ? `Kỳ phát hành #${issueNumber}`
            : 'Tổng hợp theo kỳ bình chọn mới nhất mỗi series'}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground">Top Series</p>
            </div>
            <p className="font-bold truncate">{topSeries?.title ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(topSeries?.totalVotes ?? 0).toLocaleString()} votes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-violet-600" />
              <p className="text-xs font-medium text-muted-foreground">Số Series Xếp Hạng</p>
            </div>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-muted-foreground">Tổng Vote</p>
            </div>
            <p className="text-2xl font-bold">{totalVotes.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={clsx('shadow-sm', atRiskCount > 0 && 'border-red-200 bg-red-50/40')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={clsx('h-4 w-4', atRiskCount > 0 ? 'text-red-600' : 'text-muted-foreground')} />
              <p className="text-xs font-medium text-muted-foreground">At Risk</p>
            </div>
            <p className={clsx('text-2xl font-bold', atRiskCount > 0 && 'text-red-700')}>{atRiskCount}</p>
            {atRiskCount > 0 && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-red-700"
                onClick={() => navigate('/board/series-decisions')}
              >
                Xem quyết định
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant={viewMode === 'latest' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('latest')}
        >
          Mới nhất
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
          Theo kỳ
        </Button>
        {viewMode === 'issue' && (
          <Select
            value={issueNumber != null ? String(issueNumber) : undefined}
            onValueChange={v => setIssueNumber(Number(v))}
          >
            <SelectTrigger className="w-28 h-8"><SelectValue placeholder="Kỳ" /></SelectTrigger>
            <SelectContent>
              {issueOptions.map(n => (
                <SelectItem key={n} value={String(n)}>Kỳ {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="w-px h-6 bg-border mx-1 hidden sm:block" />
        {(['rank', 'votes', 'popularity'] as const).map(f => (
          <Button key={f} variant={metric === f ? 'default' : 'outline'} size="sm" onClick={() => setMetric(f)}>
            {METRIC_LABEL[f]}
          </Button>
        ))}
      </div>

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Hạng</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mangaka</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vote</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Phổ biến</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Xu hướng</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Đang tải...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Chưa có dữ liệu xếp hạng</td>
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
                        'hover:bg-muted/30 transition-colors',
                        atRisk && 'bg-red-50/60'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                          rank === 1 ? 'bg-amber-100 text-amber-700' :
                          rank === 2 ? 'bg-gray-100 text-gray-700' :
                          rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        )}>
                          #{rank}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.title}</span>
                          {atRisk && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              At Risk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{meta?.mangakaName ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{r.totalVotes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.popularityScore.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 text-xs">
                          {prevRank == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : delta > 0 ? (
                            <>
                              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-green-600 font-medium">+{delta}</span>
                            </>
                          ) : delta < 0 ? (
                            <>
                              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                              <span className="text-red-600 font-medium">{delta}</span>
                            </>
                          ) : (
                            <>
                              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">0</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {atRisk && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/board/series-decisions/${r.seriesId}`)}>
                              Quyết định
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/board/submissions/${r.seriesId}`)}>
                            <Eye className="h-3.5 w-3.5" />
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
