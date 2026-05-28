import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, FileText, ClipboardList, AlertTriangle, ArrowRight, TrendingDown } from 'lucide-react';
import Card, { CardHeader, CardTitle, StatCard } from '../../components/ui/Card';
import DeadlineCard from '../../components/ui/DeadlineCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  series, tasks, submissions, notifications, upcomingDeadlines,
  rankings, getChaptersBySeriesId
} from '../../data/mockData';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  useEffect(() => { setPageMeta({ title: 'Tổng quan' }); }, []);

  const activeSeries = series.filter(s => s.status === 'In Progress' || s.status === 'Approved');
  const activeChapters = series.flatMap(s => getChaptersBySeriesId(s.id)).filter(c => c.status === 'In Progress');
  const pendingTasks = tasks.filter(t => t.status === 'Submitted');
  const atRiskSeries = series.filter(s => s.isAtRisk);
  const recentSubmissions = submissions.slice(-4).reverse();
  const atRiskRankings = rankings.filter(r => r.isAtRisk);

  return (
    <div className="p-6 space-y-6">
      {/* At-risk alert banner */}
      {atRiskSeries.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={20} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Cảnh báo xếp hạng — {atRiskSeries.map(s => s.title).join(', ')}</p>
            <p className="text-xs text-red-600 mt-0.5">Series này có nguy cơ bị tạm dừng do xếp hạng giảm. Hãy đăng chương mới để tăng tương tác độc giả.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => navigate(`/mangaka/series/${atRiskSeries[0].id}/ranking`)}>
            Xem xếp hạng
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Series của tôi"
          value={series.length}
          sub={`${activeSeries.length} đang hoạt động`}
          icon={<BookOpen size={20} />}
        />
        <StatCard
          label="Chương đang hoạt động"
          value={activeChapters.length}
          sub="Đang thực hiện"
          icon={<FileText size={20} />}
        />
        <StatCard
          label="Chờ xét duyệt"
          value={pendingTasks.length}
          sub="Chờ phê duyệt của bạn"
          accent={pendingTasks.length > 0}
          icon={<ClipboardList size={20} />}
        />
        <StatCard
          label="Series có nguy cơ"
          value={atRiskSeries.length}
          sub={atRiskSeries.length > 0 ? 'Cần chú ý' : 'Tất cả series ổn định'}
          icon={<AlertTriangle size={20} />}
          className={atRiskSeries.length > 0 ? 'border-red-200 bg-red-50' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming deadlines */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Thời hạn sắp tới</h2>
            <button onClick={() => navigate('/mangaka/series')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight size={12} />
            </button>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground text-center py-4">Không có thời hạn sắp tới.</p></Card>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map(chapter => (
                <DeadlineCard key={chapter.id} chapter={chapter} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Recent assistant submissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Nộp bài gần đây</h2>
              <button onClick={() => navigate('/mangaka/tasks')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                Tất cả nhiệm vụ <ArrowRight size={12} />
              </button>
            </div>
            <Card padding="none">
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-5 px-4">Không có bài chờ duyệt.</p>
              ) : (
                <div className="divide-y divide-border">
                  {pendingTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/mangaka/tasks/${task.id}/review`)}
                      className="flex items-start gap-3 p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">
                        {task.type.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{task.seriesTitle} · {task.chapterTitle}</p>
                      </div>
                      <Badge status="Submitted" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Ranking snapshot */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Xếp hạng Series</h2>
            </div>
            <Card padding="none">
              <div className="divide-y divide-border">
                {series.filter(s => s.currentRank > 0).sort((a, b) => a.currentRank - b.currentRank).map(s => {
                  const ranking = rankings.find(r => r.seriesId === s.id);
                  const delta = (s.previousRank - s.currentRank);
                  return (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/mangaka/series/${s.id}/ranking`)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-sm text-foreground shrink-0">
                        #{s.currentRank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.voteScore.toLocaleString()} phiếu</p>
                      </div>
                      {ranking && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'}
                          {delta !== 0 && Math.abs(delta)}
                          {s.isAtRisk && <TrendingDown size={12} className="text-red-500 ml-1" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Submission history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Nộp bài biên tập gần đây</h2>
          <button onClick={() => navigate('/mangaka/submissions')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            Toàn bộ lịch sử <ArrowRight size={12} />
          </button>
        </div>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Series</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Phản hồi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSubmissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium">{sub.seriesTitle}</td>
                    <td className="px-5 py-3 text-muted-foreground">{sub.submittedDate}</td>
                    <td className="px-5 py-3"><Badge status={sub.status} /></td>
                    <td className="px-5 py-3 text-muted-foreground text-xs max-w-xs truncate hidden md:table-cell">{sub.feedback ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
