import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clock,
  Eye,
  LayoutDashboard,
  RefreshCw,
  ClipboardCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../app/components/ui/button';
import {
  getEditorAssignedSeries,
  getEditorStudioProgress,
  type EditorChapterProgress,
  type EditorStudioProgress,
} from '../../services/editorApi';

const REFRESH_MS = 10_000;

export default function EditorStudioPage() {
  usePageMeta({ title: 'Tiến độ Studio' });
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState<{ id: string; title: string }[]>([]);
  const [progressBySeries, setProgressBySeries] = useState<Record<string, EditorStudioProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadProgress = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const assigned = await getEditorAssignedSeries();
      setSeriesList(assigned.map(item => ({ id: item.id, title: item.title })));

      const results = await Promise.all(
        assigned.map(async series => {
          try {
            const progress = await getEditorStudioProgress(series.id);
            return [series.id, progress] as const;
          } catch {
            return null;
          }
        }),
      );

      const next: Record<string, EditorStudioProgress> = {};
      results.forEach(entry => {
        if (entry) next[entry[0]] = entry[1];
      });
      setProgressBySeries(next);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tiến độ studio.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
    const timer = window.setInterval(() => loadProgress(false), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProgress(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadProgress]);

  const summary = useMemo(() => {
    const list = Object.values(progressBySeries);
    return {
      seriesCount: seriesList.length,
      pendingTasks: list.reduce((s, p) => s + p.chapters.reduce((c, ch) => c + ch.pendingTasks, 0), 0),
      activeTasks: list.reduce((s, p) => s + p.chapters.reduce((c, ch) => c + ch.activeTasks, 0), 0),
      overdueChapters: list.reduce((s, p) => s + p.overdueChapters, 0),
    };
  }, [progressBySeries, seriesList.length]);

  return (
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tiến độ Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi trang, task và deadline — tự làm mới mỗi 10 giây
            {lastUpdated && (
              <span className="ml-1.5">· cập nhật {lastUpdated.toLocaleTimeString('vi-VN')}</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadProgress(false)} disabled={refreshing}>
          <RefreshCw className={clsx('h-4 w-4 mr-1.5', refreshing && 'animate-spin')} />
          Làm mới
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          Đang tải tiến độ studio…
        </div>
      ) : seriesList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          Bạn chưa được gán series phụ trách.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <SummaryTile
              label="Series phụ trách"
              value={String(summary.seriesCount)}
              icon={<BookOpen size={18} />}
              iconClass="bg-violet-100 text-violet-700"
            />
            <SummaryTile
              label="Task chờ làm"
              value={String(summary.pendingTasks)}
              icon={<Clock size={18} />}
              iconClass="bg-amber-100 text-amber-700"
            />
            <SummaryTile
              label="Đang chạy / chờ duyệt"
              value={String(summary.activeTasks)}
              icon={<Activity size={18} />}
              iconClass="bg-emerald-100 text-emerald-700"
            />
            <SummaryTile
              label="Chương trễ hạn"
              value={String(summary.overdueChapters)}
              icon={<AlertTriangle size={18} />}
              iconClass={
                summary.overdueChapters > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
              }
              className={summary.overdueChapters > 0 ? 'border-red-200 bg-red-50/40' : undefined}
            />
          </div>

          <div className="space-y-4 sm:space-y-5">
            {seriesList.map(series => {
              const progress = progressBySeries[series.id];
              if (!progress) {
                return (
                  <div
                    key={series.id}
                    className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground"
                  >
                    Không tải được tiến độ cho {series.title}.
                  </div>
                );
              }
              return (
                <SeriesProgressCard
                  key={series.id}
                  progress={progress}
                  onStudio={() => navigate(`/editor/series/${series.id}`)}
                  onRead={() => navigate(`/editor/series/${series.id}/read`)}
                  onReviewChapter={chapterId => navigate(`/editor/chapters/${chapterId}/review`)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  iconClass,
  className,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconClass: string;
  className?: string;
}) {
  return (
    <div className={clsx('rounded-2xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SeriesProgressCard({
  progress,
  onStudio,
  onRead,
  onReviewChapter,
}: {
  progress: EditorStudioProgress;
  onStudio: () => void;
  onRead: () => void;
  onReviewChapter: (chapterId: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border/70">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold tracking-tight truncate">{progress.title}</h2>
            {progress.overdueChapters > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />
                {progress.overdueChapters} trễ hạn
              </span>
            )}
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {progress.overallProgressPercent}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {progress.chapterCount} chương · {progress.completedPages}/{progress.totalPages} trang ·{' '}
            {progress.completedTasks}/{progress.totalTasks} task
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onRead}>
            <Eye className="h-4 w-4 mr-1.5" />
            Xem trang truyện
          </Button>
          <Button variant="secondary" size="sm" onClick={onStudio}>
            <LayoutDashboard className="h-4 w-4 mr-1.5" />
            Studio
          </Button>
        </div>
      </div>

      {progress.chapters.length === 0 ? (
        <p className="px-4 sm:px-5 py-3 text-sm text-muted-foreground">Chưa có chương sản xuất.</p>
      ) : (
        <ul className="divide-y divide-border/70">
          {progress.chapters.map(chapter => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              onReview={() => onReviewChapter(chapter.id)}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function ChapterRow({
  chapter,
  onReview,
}: {
  chapter: EditorChapterProgress;
  onReview: () => void;
}) {
  const totalTasks = chapter.pendingTasks + chapter.activeTasks + chapter.doneTasks;

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-4 sm:px-5 py-3 hover:bg-muted/25 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-sm truncate">
            Ch.{chapter.chapterNumber}
            <span className="font-normal text-muted-foreground"> · </span>
            {chapter.title}
          </p>
          {chapter.isOverdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Trễ hạn
            </span>
          )}
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
            {chapter.progressPercent}%
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>
            {chapter.completedPages}/{chapter.pageCount} trang
          </span>
          <span className="text-border">·</span>
          <span>
            Task {chapter.doneTasks}/{totalTasks}
          </span>
          {chapter.deadline && (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(chapter.deadline).toLocaleDateString('vi-VN')}
              </span>
            </>
          )}
        </p>
      </div>

      <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" onClick={onReview}>
        <ClipboardCheck className="h-4 w-4 mr-1.5" />
        Review
      </Button>
    </li>
  );
}
