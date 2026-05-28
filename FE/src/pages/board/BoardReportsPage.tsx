import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { getBoardStats, getBoardRankings, getReaderVoteInputs, getBoardSubmissions } from '../../data/mockData';
import { FileText, TrendingUp, Star, XCircle, BarChart3, Activity } from 'lucide-react';
import { clsx } from 'clsx';

export default function BoardReportsPage() {
  usePageMeta({ title: 'Báo Cáo' });

  const stats = getBoardStats();
  const rankings = getBoardRankings();
  const recentVotes = getReaderVoteInputs();
  const submissions = getBoardSubmissions();

  const totalSubmissions = submissions.length;
  const approvalRate = Math.round((stats.approved / totalSubmissions) * 100);
  const avgVoteScore =
    recentVotes.reduce((sum, v) => sum + v.readerScore, 0) / recentVotes.length;

  const reportCards = [
    { label: 'Tổng Submissions', value: totalSubmissions, icon: <FileText className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tỷ Lệ Phê Duyệt', value: `${approvalRate}%`, icon: <TrendingUp className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Điểm Vote TB', value: avgVoteScore.toFixed(1), icon: <Star className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Series Đã Hủy', value: stats.cancelled, icon: <XCircle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  // Submission status distribution
  const statusDist = [
    { label: 'Đã Duyệt', count: stats.approved, color: 'bg-green-500' },
    { label: 'Từ Chối', count: stats.cancelled, color: 'bg-red-500' },
    { label: 'Chờ Duyệt', count: stats.pending, color: 'bg-blue-500' },
    { label: 'Cần TT', count: submissions.filter(s => s.status === 'More Info Required').length, color: 'bg-amber-500' },
  ];
  const totalDist = statusDist.reduce((sum, d) => sum + d.count, 0);

  // Vote performance by series
  const seriesVoteMap: Record<string, number[]> = {};
  recentVotes.forEach(v => {
    if (!seriesVoteMap[v.seriesTitle]) seriesVoteMap[v.seriesTitle] = [];
    seriesVoteMap[v.seriesTitle].push(v.readerScore);
  });
  const votePerf = Object.entries(seriesVoteMap).map(([title, scores]) => ({
    title,
    avg: scores.reduce((s, v) => s + v, 0) / scores.length,
    latest: scores[0],
  })).sort((a, b) => b.avg - a.avg);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Báo Cáo Tổng Quan</h1>
        <p className="text-muted-foreground mt-1">Tổng hợp hiệu suất xuất bản và biểu quyết hội đồng</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {reportCards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={clsx('p-2.5 rounded-xl', card.bg)}>
                  <span className={card.color}>{card.icon}</span>
                </div>
              </div>
              <p className="text-2xl font-bold mb-1">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Publishing Status Distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Phân Bố Trạng Thái Submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusDist.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.count} ({totalDist ? Math.round((item.count / totalDist) * 100) : 0}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', item.color)}
                    style={{ width: totalDist ? `${(item.count / totalDist) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Vote Performance */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Hiệu Suất Vote Theo Series
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {votePerf.map((s) => (
              <div key={s.title} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{s.title}</span>
                    <span className={clsx('text-sm font-bold ml-2 shrink-0',
                      s.avg >= 9 ? 'text-green-600' : s.avg >= 7 ? 'text-blue-600' : 'text-red-600'
                    )}>
                      {s.avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full',
                        s.avg >= 9 ? 'bg-green-500' : s.avg >= 7 ? 'bg-blue-500' : 'bg-red-400'
                      )}
                      style={{ width: `${(s.avg / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ranking Trend Table */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Xu Hướng Ranking (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Hạng</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Series</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Mangaka</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground">Vote Score</th>
                    <th className="text-center pb-3 font-medium text-muted-foreground">Xu Hướng</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rankings.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 pr-4 font-bold text-muted-foreground">#{r.rank}</td>
                      <td className="py-3 pr-4 font-medium">{r.seriesTitle}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.mangakaName}</td>
                      <td className="py-3 text-right font-mono">{r.voteScore.toLocaleString()}</td>
                      <td className="py-3 text-center">
                        {r.trend === 'up' ? (
                          <span className="text-green-600 text-xs font-semibold">↑ Tăng</span>
                        ) : r.trend === 'down' ? (
                          <span className="text-red-600 text-xs font-semibold">↓ Giảm</span>
                        ) : (
                          <span className="text-gray-500 text-xs font-semibold">→ Giữ</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
