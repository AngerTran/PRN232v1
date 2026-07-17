import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, FileText, ClipboardList, AlertTriangle, ArrowRight, TrendingDown } from 'lucide-react';
import Card, { StatCard } from '../../components/ui/Card';
import DeadlineCard from '../../components/ui/DeadlineCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
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
        setChapters(lists.flat());
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
  // Bản nháp cũng là công việc đang làm; chỉ loại chương đã duyệt / xuất bản.
  const activeChapters = chapters.filter(
    c => c.status === 'Draft' || c.status === 'In Progress' || c.status === 'Review',
  );
  const atRiskSeries = series.filter(s => s.isAtRisk);

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
          sub="Bản nháp / đang làm / xét duyệt"
          icon={<FileText size={20} />}
        />
        <StatCard
          label="Tổng số chương"
          value={chapters.length}
          sub="Trên tất cả series"
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
                <DeadlineCard
                  key={chapter.id}
                  chapter={chapter}
                  onDelete={canMangakaDeleteChapter(chapter.status) ? handleDeleteChapter : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Series đang hoạt động</h2>
              <button onClick={() => navigate('/mangaka/series')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                Tất cả series <ArrowRight size={12} />
              </button>
            </div>
            <Card padding="none">
              {activeSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-5 px-4">Chưa có series đang hoạt động.</p>
              ) : (
                <div className="divide-y divide-border">
                  {activeSeries.map(s => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/mangaka/series/${s.id}`)}
                      className="flex items-center gap-3 p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      {s.coverUrl && (
                        <div className="w-8 h-10 rounded-lg overflow-hidden shrink-0">
                          <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.genre}</p>
                      </div>
                      <Badge status={s.status} size="sm" />
                    </div>
                  ))}
                </div>
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
                        <div className={`flex items-center gap-1 text-xs font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
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
