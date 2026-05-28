import { useState } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { getBoardRankings } from '../../data/mockData';
import { RankingStatusBadge, PublishingTypeBadge } from '../../app/components/ui/board';
import { TrendingUp, TrendingDown, Minus, Trophy, Zap, AlertTriangle, Eye } from 'lucide-react';
import { clsx } from 'clsx';

export default function BoardRankingPage() {
  usePageMeta({ title: 'Bảng Xếp Hạng' });
  const [filter, setFilter] = useState<'all' | 'Weekly' | 'Monthly'>('all');

  const rankings = getBoardRankings();
  const filtered = filter === 'all' ? rankings : rankings.filter((r) => r.publishingType === filter);

  const topSeries = rankings[0];
  const biggestRise = [...rankings].sort((a, b) => (b.previousRank - b.rank) - (a.previousRank - a.rank))[0];
  const biggestDrop = [...rankings].sort((a, b) => (a.rank - a.previousRank) - (b.rank - b.previousRank))[0];
  const atRiskCount = rankings.filter((r) => r.status === 'At Risk').length;

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) =>
    trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> :
    trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-600" /> :
    <Minus className="h-4 w-4 text-gray-400" />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bảng Xếp Hạng Series</h1>
        <p className="text-muted-foreground mt-1">Cập nhật theo kỳ bình chọn mới nhất</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground">Top Series</p>
            </div>
            <p className="font-bold truncate">{topSeries?.seriesTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{topSeries?.voteScore.toLocaleString()} votes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-muted-foreground">Tăng Nhiều Nhất</p>
            </div>
            <p className="font-bold truncate">{biggestRise?.seriesTitle}</p>
            {biggestRise && biggestRise.previousRank > biggestRise.rank && (
              <p className="text-xs text-green-600 mt-0.5">+{biggestRise.previousRank - biggestRise.rank} bậc</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-xs font-medium text-muted-foreground">Giảm Nhiều Nhất</p>
            </div>
            <p className="font-bold truncate">{biggestDrop?.seriesTitle}</p>
            {biggestDrop && biggestDrop.rank > biggestDrop.previousRank && (
              <p className="text-xs text-red-600 mt-0.5">-{biggestDrop.rank - biggestDrop.previousRank} bậc</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-xs font-medium text-muted-foreground">At Risk</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{atRiskCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">series nguy hiểm</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'Weekly', 'Monthly'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tất Cả' : f === 'Weekly' ? 'Hàng Tuần' : 'Hàng Tháng'}
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Trước</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mangaka</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vote Score</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Xu Hướng</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại XB</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng Thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => {
                const rankChange = r.previousRank - r.rank;
                return (
                  <tr
                    key={r.id}
                    className={clsx(
                      'hover:bg-muted/30 transition-colors',
                      r.status === 'At Risk' && 'bg-red-50/50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                        r.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        r.rank === 2 ? 'bg-gray-100 text-gray-700' :
                        r.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      )}>
                        #{r.rank}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-xs">#{r.previousRank}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.seriesTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.mangakaName}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{r.voteScore.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <TrendIcon trend={r.trend} />
                        {rankChange !== 0 && (
                          <span className={clsx('text-xs font-semibold', rankChange > 0 ? 'text-green-600' : 'text-red-600')}>
                            {rankChange > 0 ? '+' : ''}{rankChange}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PublishingTypeBadge type={r.publishingType} />
                    </td>
                    <td className="px-4 py-3">
                      <RankingStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
