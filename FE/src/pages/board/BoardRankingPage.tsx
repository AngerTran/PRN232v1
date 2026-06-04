import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { getLeaderboard, type LeaderboardItem } from '../../services/boardApi';
import { Trophy, BarChart3, Star, Eye } from 'lucide-react';
import { clsx } from 'clsx';

type Metric = 'votes' | 'popularity' | 'rank';

const METRIC_LABEL: Record<Metric, string> = {
  votes: 'Theo Vote',
  popularity: 'Theo Độ Phổ Biến',
  rank: 'Theo Xếp Hạng',
};

export default function BoardRankingPage() {
  usePageMeta({ title: 'Bảng Xếp Hạng' });
  const navigate = useNavigate();
  const [metric, setMetric] = useState<Metric>('rank');
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError('');
    getLeaderboard(metric)
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
  }, [metric]);

  const topSeries = items[0];
  const totalVotes = items.reduce((sum, i) => sum + i.totalVotes, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bảng Xếp Hạng Series</h1>
        <p className="text-muted-foreground mt-1">Cập nhật theo kỳ bình chọn mới nhất</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
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
      </div>

      {/* Metric filter */}
      <div className="flex gap-2">
        {(['rank', 'votes', 'popularity'] as const).map(f => (
          <Button key={f} variant={metric === f ? 'default' : 'outline'} size="sm" onClick={() => setMetric(f)}>
            {METRIC_LABEL[f]}
          </Button>
        ))}
      </div>

      {/* Ranking Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Hạng</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vote Score</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Độ Phổ Biến</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Đang tải...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Chưa có dữ liệu xếp hạng</td>
                </tr>
              ) : (
                items.map((r, idx) => {
                  const rank = r.latestRank ?? idx + 1;
                  return (
                    <tr key={r.seriesId} className="hover:bg-muted/30 transition-colors">
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
                      <td className="px-4 py-3 font-medium">{r.title}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{r.totalVotes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.popularityScore.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/board/submissions/${r.seriesId}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
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
