import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, BarChart2, Shield, TrendingDown } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import { Textarea } from '../../app/components/ui/textarea';
import {
  getEditorAssignedSeries,
  getEditorDefenseNote,
  saveEditorDefenseNote,
} from '../../services/editorApi';
import {
  getDangerZoneSeries,
  getRankingHistory,
  getSeriesStats,
  type SeriesStats,
} from '../../services/seriesApi';
import type { Series } from '../../types/domain';

interface DefenseItem {
  series: Series;
  stats: SeriesStats | null;
  latestRank: number | null;
  voteCount: number;
  defenseNote: string;
  defenseNoteUpdatedAt?: string;
  savingNote?: boolean;
}

export default function SeriesDefensePage() {
  usePageMeta({ title: 'Series Defense' });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusSeriesId = searchParams.get('seriesId');

  const [items, setItems] = useState<DefenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([getDangerZoneSeries(), getEditorAssignedSeries()])
      .then(async ([dangerSeries, assigned]) => {
        const assignedIds = new Set(assigned.map(series => series.id));
        const filtered = dangerSeries.filter(series => assignedIds.has(series.id));

        const enriched = await Promise.all(
          filtered.map(async series => {
            const [stats, history, defense] = await Promise.all([
              getSeriesStats(series.id).catch(() => null),
              getRankingHistory(series.id).catch(() => []),
              getEditorDefenseNote(series.id).catch(() => ({ seriesId: series.id, note: series.editorDefenseNote })),
            ]);
            const latest = history[0];
            return {
              series,
              stats,
              latestRank: latest?.rankPosition ?? stats?.latestRanking?.rankPosition ?? null,
              voteCount: latest?.voteCount ?? stats?.latestRanking?.voteCount ?? series.voteScore,
              defenseNote: defense.note ?? '',
              defenseNoteUpdatedAt: defense.updatedAt ?? series.editorDefenseNoteUpdatedAt,
            } satisfies DefenseItem;
          })
        );

        if (!active) return;
        const ordered = focusSeriesId
          ? [...enriched].sort((a, b) => {
              if (a.series.id === focusSeriesId) return -1;
              if (b.series.id === focusSeriesId) return 1;
              return 0;
            })
          : enriched;
        setItems(ordered);
      })
      .catch(err => {
        if (active) {
          setItems([]);
          setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu series defense.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [focusSeriesId]);

  const handleSaveDefenseNote = async (seriesId: string) => {
    const item = items.find(entry => entry.series.id === seriesId);
    if (!item) return;

    setItems(current =>
      current.map(entry => entry.series.id === seriesId ? { ...entry, savingNote: true } : entry)
    );
    setError('');

    try {
      const saved = await saveEditorDefenseNote(seriesId, item.defenseNote);
      setItems(current =>
        current.map(entry =>
          entry.series.id === seriesId
            ? {
                ...entry,
                defenseNote: saved.note ?? '',
                defenseNoteUpdatedAt: saved.updatedAt,
                savingNote: false,
              }
            : entry
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ghi chú bảo vệ.');
      setItems(current =>
        current.map(entry => entry.series.id === seriesId ? { ...entry, savingNote: false } : entry)
      );
    }
  };

  const updateDefenseNote = (seriesId: string, note: string) => {
    setItems(current =>
      current.map(entry => (entry.series.id === seriesId ? { ...entry, defenseNote: note } : entry))
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Series Defense</h1>
          <p className="text-muted-foreground">
            Chuẩn bị dữ liệu bảo vệ các series At Risk trước hội đồng biên tập
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Đang tải dữ liệu...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Hiện không có series At Risk trong phạm vi bạn phụ trách.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(({ series, stats, latestRank, voteCount, defenseNote, defenseNoteUpdatedAt, savingNote }) => (
            <Card
              key={series.id}
              className={series.id === focusSeriesId ? 'border-orange-300 shadow-md' : 'border-red-200'}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={series.coverUrl}
                      alt={series.title}
                      className="h-20 w-14 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{series.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {series.mangakaName ?? '—'} · {series.genre}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="shrink-0">At Risk</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <BarChart2 className="h-3.5 w-3.5" /> Xếp hạng hiện tại
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {latestRank ? `#${latestRank}` : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Tổng vote</p>
                    <p className="text-2xl font-bold mt-1">{voteCount.toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Chương / Trang</p>
                    <p className="text-2xl font-bold mt-1">
                      {stats?.chapterCount ?? series.chaptersCount} / {stats?.pageCount ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" /> Vote hội đồng
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {stats ? `${stats.approveVotes}/${stats.boardVoteCount}` : '—'}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {series.synopsis || 'Chưa có tóm tắt series.'}
                </p>

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Ghi chú bảo vệ trước hội đồng</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Soạn luận điểm, số liệu và đề xuất để hội đồng tham khảo khi quyết định.
                    </p>
                  </div>
                  <Textarea
                    rows={5}
                    value={defenseNote}
                    onChange={event => updateDefenseNote(series.id, event.target.value)}
                    placeholder="Ví dụ: xu hướng vote ổn định, kế hoạch tăng tốc sản xuất, lý do nên tiếp tục xuất bản..."
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {defenseNoteUpdatedAt
                        ? `Cập nhật ${new Date(defenseNoteUpdatedAt).toLocaleString('vi-VN')}`
                        : 'Chưa lưu ghi chú'}
                    </p>
                    <Button
                      size="sm"
                      disabled={savingNote}
                      onClick={() => handleSaveDefenseNote(series.id)}
                    >
                      {savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/editor/series/${series.id}`)}>
                    Xem series
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/board/series-decisions')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Quyết định hội đồng
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
