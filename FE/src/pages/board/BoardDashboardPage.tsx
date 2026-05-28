import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import {
  currentBoard, getBoardStats, getBoardSubmissions,
  getBoardRankings, getSeriesDecisions,
} from '../../data/mockData';
import {
  SubmissionStatusBadge, RankingStatusBadge, PublishingTypeBadge
} from '../../app/components/ui/board';
import {
  FileText, Star, CalendarDays, AlertTriangle, XCircle,
  TrendingUp, TrendingDown, Minus, ArrowRight, Gavel,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function BoardDashboardPage() {
  usePageMeta({ title: 'Board Dashboard' });
  const navigate = useNavigate();

  const stats = getBoardStats();
  const pendingSubmissions = getBoardSubmissions().filter(s => s.status === 'Pending Review').slice(0, 3);
  const rankings = getBoardRankings();
  const atRiskRankings = rankings.filter(r => r.status === 'At Risk').slice(0, 4);
  const recentDecisions = getSeriesDecisions().slice(0, 3);

  const summaryCards = [
    { label: 'Chờ Duyệt', value: stats.pending, icon: <FileText className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Series Đã Duyệt', value: stats.approved, icon: <Star className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Đang Xuất Bản', value: stats.publishing, icon: <CalendarDays className="h-4 w-4" />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'At Risk', value: stats.atRisk, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Đã Từ Chối', value: stats.cancelled, icon: <XCircle className="h-4 w-4" />, color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) =>
    trend === 'up' ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> :
    trend === 'down' ? <TrendingDown className="h-3.5 w-3.5 text-red-600" /> :
    <Minus className="h-3.5 w-3.5 text-gray-400" />;

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <Card className="border-0 shadow-md" style={{ background: 'linear-gradient(135deg, #1F1F1F 0%, #3a1f1f 100%)' }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium mb-1">Hội Đồng Biên Tập</p>
              <h1 className="text-2xl font-bold text-white mb-2">
                Chào mừng trở lại, {currentBoard.name}
              </h1>
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
        {summaryCards.map((card) => (
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
        {pendingSubmissions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingSubmissions.map((sub) => (
              <Card key={sub.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/board/submissions/${sub.id}`)}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <img src={sub.coverUrl} alt={sub.seriesTitle} className="w-16 h-22 object-cover rounded-lg shrink-0" style={{ height: '88px' }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate">{sub.seriesTitle}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{sub.mangakaName}</p>
                      <Badge variant="outline" className="text-xs mb-2">{sub.genre}</Badge>
                      <div className="mt-auto">
                        <SubmissionStatusBadge status={sub.status} />
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="text-green-600 font-medium">✓ {sub.voteResult.approve}</span>
                        <span className="text-red-600 font-medium">✗ {sub.voteResult.reject}</span>
                        <span className="text-amber-600 font-medium">? {sub.voteResult.moreInfo}</span>
                      </div>
                    </div>
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

      {/* Ranking Alerts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Cảnh Báo Ranking</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/board/rankings')} className="text-primary">
            Xem bảng xếp hạng <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {atRiskRankings.map((r) => (
            <Card key={r.id} className="shadow-sm border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold text-sm">
                      #{r.rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.seriesTitle}</p>
                      <p className="text-xs text-muted-foreground">{r.mangakaName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={r.trend} />
                    <RankingStatusBadge status={r.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>{r.voteScore.toLocaleString()} votes</span>
                  <PublishingTypeBadge type={r.publishingType} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Decisions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Series Cần Quyết Định</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/board/series-decisions')} className="text-primary">
            Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-3">
          {recentDecisions.map((d) => (
            <Card key={d.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={d.coverUrl} alt={d.seriesTitle} className="w-10 h-14 object-cover rounded" />
                    <div>
                      <p className="font-medium">{d.seriesTitle}</p>
                      <p className="text-xs text-muted-foreground">{d.mangakaName}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Hạng #{d.currentRank} · {d.bottomRankingCount} tuần liên tiếp
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/board/series-decisions/${d.id}`)}>
                    Quyết Định
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
