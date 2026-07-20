import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, AlertTriangle, ArrowRight, TrendingDown, Crown } from 'lucide-react';
import Card, { StatCard } from '../../components/ui/Card';
import DeadlineCard from '../../components/ui/DeadlineCard';
import Button from '../../components/ui/Button';
import SeriesCard from '../../components/ui/SeriesCard';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { Chapter, Series } from '../../types/domain';
import {
  canMangakaDeleteChapter,
  deleteChapter,
  getMySeries,
  getSeriesChapters,
  isSeriesClosedForProduction,
} from '../../services/seriesApi';

type ChapterWithSeries = Chapter & { series?: Series };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();

  const [series, setSeries] = useState<Series[]>([]);
  const [chapters, setChapters] = useState<ChapterWithSeries[]>([]);

  useEffect(() => { setPageMeta({ title: 'Tổng quan' }); }, []);

  useEffect(() => {
    let isActive = true;
    getMySeries()
      .then(async list => {
        const lists = await Promise.all(
          list.map(async s => {
            const chs = await getSeriesChapters(s.id).catch(() => [] as Chapter[]);
            return chs.map(c => ({ ...c, series: s }));
          })
        );
        if (!isActive) return;
        setSeries(list);
        // Chương 0 = bản thảo đề xuất khi nộp series — không tính vào sản xuất / thống kê.
        setChapters(lists.flat().filter(c => c.number > 0));
      })
      .catch(() => {
        if (isActive) {
          setSeries([]);
          setChapters([]);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleDeleteChapter = async (chapterId: string) => {
    const target = chapters.find(c => c.id === chapterId);
    if (!target || !canMangakaDeleteChapter(target.status)) return;

    const confirmed = await confirm({
      title: 'Xóa chương nháp',
      variant: 'danger',
      message: (
        <>
          Bạn có chắc muốn xóa chương nháp{' '}
          <span className="font-semibold text-foreground">Ch.{target.number} {target.title}</span>?
          <br />
          Hành động này không thể hoàn tác.
        </>
      ),
      confirmText: 'Xóa chương',
    });
    if (!confirmed) return;

    const previous = chapters;
    setChapters(prev => prev.filter(c => c.id !== chapterId));
    try {
      await deleteChapter(chapterId);
    } catch {
      setChapters(previous);
    }
  };

  // Đã duyệt / đang XB / sẵn sàng XB đều còn trong vòng sản xuất.
  const activeSeries = series.filter(
    s => s.status === 'In Progress' || s.status === 'Approved' || s.status === 'Completed',
  );
  const atRiskSeries = series.filter(s => s.isAtRisk);
  const topRankedSeries = series
    .filter(s => s.currentRank > 0)
    .sort((a, b) => a.currentRank - b.currentRank || b.voteScore - a.voteScore)[0];

  const upcomingDeadlines = chapters
    .filter(c => {
      // Chương đã duyệt / xuất bản đã đóng công việc, không còn là deadline sắp tới.
      if (
        !c.deadline
        || c.status === 'Approved'
        || c.status === 'Published'
        || !c.series
      ) return false;
      return !isSeriesClosedForProduction(c.series.status);
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6);

  const orphanDraftChapters = chapters
    .filter(c => {
      if (c.status !== 'Draft' || !c.series) return false;
      return isSeriesClosedForProduction(c.series.status);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const rankedSeries = series.filter(s => s.currentRank > 0).sort((a, b) => a.currentRank - b.currentRank);

  return (
    <div className="p-6 space-y-6">
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

      {orphanDraftChapters.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">Chương nháp cần dọn dẹp</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Các chương nháp thuộc series đã hoàn thành hoặc đã đóng — không còn deadline thực tế. Bạn có thể xóa chúng để gỡ cảnh báo trễ hạn.
              Series đã hoàn thành không thể xóa, chỉ xóa được chương nháp.
            </p>
          </div>
          <div className="space-y-2">
            {orphanDraftChapters.map(chapter => (
              <DeadlineCard
                key={chapter.id}
                chapter={chapter}
                onDelete={handleDeleteChapter}
                hint="Series đã kết thúc — xóa chương nháp nếu không cần giữ."
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Series của tôi"
          value={series.length}
          sub={`${activeSeries.length} đang hoạt động`}
          icon={<BookOpen size={20} />}
        />
        <Card
          className={topRankedSeries ? 'cursor-pointer hover:shadow-md transition-shadow' : undefined}
          onClick={
            topRankedSeries
              ? () => navigate(`/mangaka/series/${topRankedSeries.id}/ranking`)
              : undefined
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Series dẫn đầu
              </p>
              <p className="text-2xl font-bold tracking-tight truncate">
                {topRankedSeries?.title ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {topRankedSeries
                  ? `Hạng #${topRankedSeries.currentRank} · ${topRankedSeries.voteScore.toLocaleString()} vote`
                  : 'Chưa có dữ liệu xếp hạng'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl shrink-0 bg-amber-100 text-amber-700">
              <Crown size={20} />
            </div>
          </div>
        </Card>
        <StatCard
          label="Series có nguy cơ"
          value={atRiskSeries.length}
          sub={atRiskSeries.length > 0 ? 'Cần chú ý' : 'Tất cả series ổn định'}
          icon={<AlertTriangle size={20} />}
          className={atRiskSeries.length > 0 ? 'border-red-200 bg-red-50' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Trái — series đang hoạt động (lưới như Series của tôi) */}
        <div className="lg:col-span-2 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-base">Series đang hoạt động</h2>
            <button
              type="button"
              onClick={() => navigate('/mangaka/series')}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 shrink-0"
            >
              Tất cả series <ArrowRight size={12} />
            </button>
          </div>
          {activeSeries.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có series đang hoạt động.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeSeries.map(s => (
                <SeriesCard key={s.id} series={s} view="grid" />
              ))}
            </div>
          )}
        </div>

        {/* Phải — thời hạn gọn + xếp hạng */}
        <div className="space-y-5 min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">Thời hạn sắp tới</h2>
              <button
                type="button"
                onClick={() => navigate('/mangaka/chapters')}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 shrink-0"
              >
                Xem tất cả <ArrowRight size={12} />
              </button>
            </div>
            <Card padding="none" className="overflow-hidden">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center px-4 py-6">Không có thời hạn sắp tới.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcomingDeadlines.slice(0, 5).map(chapter => {
                    const deadlineDate = chapter.deadline ? new Date(chapter.deadline) : null;
                    const daysLeft = deadlineDate
                      ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    const urgent = daysLeft !== null && daysLeft <= 5;
                    const overdue = daysLeft !== null && daysLeft < 0;
                    return (
                      <li key={chapter.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/mangaka/chapters/${chapter.id}`)}
                          className="w-full text-left px-3.5 py-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {chapter.series && (
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                                  {chapter.series.title}
                                </p>
                              )}
                              <p className="text-sm font-semibold truncate mt-0.5">
                                Ch.{chapter.number} — {chapter.title}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] font-bold shrink-0 ${
                                overdue ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-muted-foreground'
                              }`}
                            >
                              {daysLeft === null
                                ? '—'
                                : overdue
                                  ? `Trễ ${Math.abs(daysLeft)}d`
                                  : daysLeft === 0
                                    ? 'Hôm nay'
                                    : `${daysLeft}d`}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Xếp hạng Series</h2>
            </div>
            <Card padding="none">
              {rankedSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-5 px-4">Chưa có dữ liệu xếp hạng.</p>
              ) : (
                <div className="divide-y divide-border">
                  {rankedSeries.map(s => {
                    const delta = s.previousRank - s.currentRank;
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
                        <div
                          className={`flex items-center gap-1 text-xs font-bold ${
                            delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'
                          }`}
                        >
                          {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'}
                          {delta !== 0 && Math.abs(delta)}
                          {s.isAtRisk && <TrendingDown size={12} className="text-red-500 ml-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
