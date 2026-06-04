import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import type { Series } from '../../data/mockData';
import { getVisibleSeries } from '../../services/seriesApi';
import { getPendingSeries, getLeaderboard, type PendingSeriesItem, type LeaderboardItem } from '../../services/boardApi';
import { getStoredUser } from '../../services/authApi';
import {
  FileText, Star, CalendarDays, AlertTriangle, XCircle, ArrowRight, Gavel, Trophy,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function BoardDashboardPage() {
  usePageMeta({ title: 'Board Dashboard' });
  const navigate = useNavigate();
  const boardName = getStoredUser()?.name ?? 'Hội đồng';

  const [series, setSeries] = useState<Series[]>([]);
  const [pending, setPending] = useState<PendingSeriesItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  useEffect(() => {
    let isActive = true;
    Promise.all([
      getVisibleSeries().catch(() => [] as Series[]),
      getPendingSeries().catch(() => [] as PendingSeriesItem[]),
      getLeaderboard('rank').catch(() => [] as LeaderboardItem[]),
    ]).then(([s, p, l]) => {
      if (!isActive) return;
      setSeries(s);
      setPending(p);
      setLeaderboard(l);
    });
    return () => {
      isActive = false;
    };
  }, []);

  const stats = {
    pending: series.filter(s => s.status === 'Submitted').length,
    approved: series.filter(s => s.status === 'Approved').length,
    publishing: series.filter(s => s.status === 'In Progress' || s.status === 'Published').length,
    atRisk: series.filter(s => s.isAtRisk).length,
    cancelled: series.filter(s => s.status === 'Cancelled').length,
  };

  const summaryCards = [
    { label: 'Chờ Duyệt', value: stats.pending, icon: <FileText className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Series Đã Duyệt', value: stats.approved, icon: <Star className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Đang Xuất Bản', value: stats.publishing, icon: <CalendarDays className="h-4 w-4" />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'At Risk', value: stats.atRisk, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Đã Từ Chối', value: stats.cancelled, icon: <XCircle className="h-4 w-4" />, color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  const pendingTop = pending.slice(0, 3);
  const topRanked = leaderboard.slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <Card className="border-0 shadow-md" style={{ background: 'linear-gradient(135deg, #1F1F1F 0%, #3a1f1f 100%)' }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium mb-1">Hội Đồng Biên Tập</p>
              <h1 className="text-2xl font-bold text-white mb-2">Chào mừng trở lại, {boardName}</h1>
              <p className="text-white/70 text-sm">
                Có <span className="text-white font-semibold">{stats.pending} series</span> đang chờ phê duyệt.
                {stats.atRisk > 0 && (
                  <span className="text-red-300"> Cảnh báo: {stats.atRisk} series đang At Risk.</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {summaryCards.map(card => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <div className={clsx('p-1.5 rounded-lg', card.bg)}>
                  <span className={card.color}>{card.icon}</span>
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Series Approval */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Series Chờ Phê Duyệt</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/board/submissions')} className="text-primary">
            Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        {pendingTop.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingTop.map(sub => (
              <Card key={sub.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/board/submissions/${sub.id}`)}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-1 truncate">{sub.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{sub.authorName ?? '—'}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600 font-medium">✓ {sub.approveVotes}</span>
                    <span className="text-red-600 font-medium">✗ {sub.rejectVotes}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Không có series nào đang chờ phê duyệt
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Ranking */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Top Xếp Hạng</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/board/rankings')} className="text-primary">
            Xem bảng xếp hạng <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        {topRanked.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {topRanked.map((r, idx) => (
              <Card key={r.seriesId} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm">
                        #{r.latestRank ?? idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.totalVotes.toLocaleString()} votes</p>
                      </div>
                    </div>
                    <Trophy className="h-4 w-4 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Chưa có dữ liệu xếp hạng
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
