import { useEffect, useMemo, useState } from 'react';
import { BarChart3, FileText, TrendingUp, XCircle } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { getApprovedSeries, getSeriesRanking, getVisibleSeriesLight, type SeriesRankingItem } from '../../services/seriesApi';
import { getPendingSeries } from '../../services/boardApi';
import type { Series } from '../../types/domain';

export default function BoardReportsPage() {
  usePageMeta({ title: 'Báo Cáo' });
  const [approvedSeries, setApprovedSeries] = useState<Series[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [rankings, setRankings] = useState<SeriesRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingError, setRankingError] = useState('');

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setRankingError('');

    Promise.all([
      getApprovedSeries().catch(() => [] as Series[]),
      getPendingSeries().catch(() => []),
      getVisibleSeriesLight().catch(() => [] as Series[]),
      getSeriesRanking().catch((err: unknown) => {
        if (isActive) {
          setRankingError(err instanceof Error ? err.message : 'Không thể tải ranking.');
        }
        return [] as SeriesRankingItem[];
      }),
    ])
      .then(([approved, pending, allSeries, rankingItems]) => {
        if (!isActive) return;
        setApprovedSeries(approved);
        setPendingCount(pending.length);
        setCancelledCount(allSeries.filter(s => s.status === 'Cancelled').length);
        setRankings(rankingItems);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = approvedSeries.filter(item =>
      ['Approved', 'In Progress', 'Completed', 'At Risk'].includes(item.status)
    ).length;
    const totalTracked = approvedSeries.length + pendingCount + cancelledCount;
    const approvalRate = totalTracked
      ? Math.round((active / totalTracked) * 100)
      : 0;

    return {
      total: approvedSeries.length,
      active,
      pending: pendingCount,
      cancelled: cancelledCount,
      approvalRate,
    };
  }, [approvedSeries, pendingCount, cancelledCount]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Báo Cáo Tổng Quan</h1>
        <p className="text-muted-foreground mt-1">Số liệu từ series chờ duyệt, đã nhận và bảng xếp hạng</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Series đã nhận', value: stats.total, icon: <FileText /> },
          { label: 'Tỷ lệ đang hoạt động', value: `${stats.approvalRate}%`, icon: <TrendingUp /> },
          { label: 'Chờ duyệt', value: stats.pending, icon: <BarChart3 /> },
          { label: 'Series đã hủy', value: stats.cancelled, icon: <XCircle /> },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="mb-3 text-primary">{item.icon}</div>
              <p className="text-2xl font-bold">{loading ? '—' : item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ranking gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {rankingError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left">Hạng</th>
                  <th className="text-left">Series</th>
                  <th className="text-right">Vote</th>
                  <th className="text-right">Điểm phổ biến</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      Đang tải...
                    </td>
                  </tr>
                ) : rankings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      Chưa có dữ liệu ranking
                    </td>
                  </tr>
                ) : (
                  rankings.map(item => (
                    <tr key={item.seriesId}>
                      <td className="py-3 font-bold">#{item.rankPosition}</td>
                      <td>{item.title}</td>
                      <td className="text-right">{item.voteCount.toLocaleString()}</td>
                      <td className="text-right">{item.popularityScore.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
