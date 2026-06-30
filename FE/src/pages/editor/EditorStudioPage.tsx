import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Activity, AlertTriangle, BookOpen, Clock, RefreshCw } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import ProgressBar from '../../components/ui/ProgressBar';
import {
  getEditorAssignedSeries,
  getEditorStudioProgress,
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
        })
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
      if (document.visibilityState === 'visible') {
        loadProgress(false);
      }
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
      pendingTasks: list.reduce((s, p) => s + p.chapters.reduce((c, ch) => c + ch.pendingTasks, 0), 0),
      activeTasks: list.reduce((s, p) => s + p.chapters.reduce((c, ch) => c + ch.activeTasks, 0), 0),
      overdueChapters: list.reduce((s, p) => s + p.overdueChapters, 0),
    };
  }, [progressBySeries]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tiến độ Studio</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi tiến độ trang, task và deadline (tự làm mới mỗi 10 giây)
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadProgress(false)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Đang tải tiến độ studio...</CardContent>
        </Card>
      ) : seriesList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Bạn chưa được gán series phụ trách.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Task chờ làm</p>
                <p className="text-2xl font-bold mt-1">{summary.pendingTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Task đang chạy / chờ duyệt</p>
                <p className="text-2xl font-bold mt-1">{summary.activeTasks}</p>
              </CardContent>
            </Card>
            <Card className={summary.overdueChapters > 0 ? 'border-red-200' : undefined}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Chương trễ hạn</p>
                <p className={`text-2xl font-bold mt-1 ${summary.overdueChapters > 0 ? 'text-red-600' : ''}`}>
                  {summary.overdueChapters}
                </p>
              </CardContent>
            </Card>
          </div>

          {seriesList.map(series => {
            const progress = progressBySeries[series.id];
            if (!progress) {
              return (
                <Card key={series.id}>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Không thể tải tiến độ cho {series.title}.
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={series.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-lg">{progress.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {progress.chapterCount} chương · {progress.completedPages}/{progress.totalPages} trang ·{' '}
                        {progress.completedTasks}/{progress.totalTasks} task
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {progress.overdueChapters > 0 && (
                        <Badge variant="destructive">{progress.overdueChapters} trễ deadline</Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={() => navigate(`/editor/series/${series.id}`)}>
                        <BookOpen className="h-4 w-4 mr-1" />
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        Tiến độ tổng studio
                      </span>
                      <span className="font-semibold text-foreground">{progress.overallProgressPercent}%</span>
                    </div>
                    <ProgressBar value={progress.overallProgressPercent} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {progress.chapters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có chương sản xuất.</p>
                  ) : (
                    progress.chapters.map(chapter => (
                      <div
                        key={chapter.id}
                        className="rounded-xl border border-border p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">
                              Ch.{chapter.chapterNumber} · {chapter.title}
                            </p>
                            {chapter.isOverdue && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                Trễ hạn
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {chapter.completedPages}/{chapter.pageCount} trang · Task {chapter.doneTasks}/{chapter.pendingTasks + chapter.activeTasks + chapter.doneTasks}
                            {chapter.deadline && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <Clock className="h-3 w-3" />
                                {new Date(chapter.deadline).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </p>
                          <div className="mt-2 max-w-md">
                            <ProgressBar value={chapter.progressPercent} showLabel />
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/editor/chapters/${chapter.id}/review`)}
                          >
                            Review
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/editor/series/${series.id}`)}
                          >
                            Studio
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
