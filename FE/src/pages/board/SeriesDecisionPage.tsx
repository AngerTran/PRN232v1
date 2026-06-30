import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Gavel } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import type { Series } from '../../types/domain';
import { getDangerZoneSeries, getSeriesStats } from '../../services/seriesApi';
import { decideDangerSeries, type DangerSeriesDecision } from '../../services/boardApi';

export default function SeriesDecisionPage() {
  usePageMeta({ title: 'Quyết Định Series' });
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getDangerZoneSeries()
      .then(async items => {
        const enriched = await Promise.all(
          items.map(async item => {
            const stats = await getSeriesStats(item.id).catch(() => null);
            if (!stats?.latestRanking) {
              return { ...item, isAtRisk: stats?.inDangerZone ?? item.isAtRisk };
            }
            return {
              ...item,
              currentRank: stats.latestRanking.rankPosition,
              voteScore: stats.latestRanking.voteCount,
              isAtRisk: stats.inDangerZone || item.isAtRisk,
            };
          })
        );
        setSeries(enriched);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải danh sách danger zone.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (seriesId: string, decision: DangerSeriesDecision) => {
    setSubmittingId(seriesId);
    setError('');
    try {
      await decideDangerSeries(seriesId, decision);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật quyết định.');
    } finally {
      setSubmittingId('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quyết Định Series At Risk</h1>
        <p className="text-muted-foreground mt-1">{series.length} series đang cần hội đồng ra quyết định</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Đang tải...</CardContent></Card>
      ) : series.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Hiện không có series nào trong danger zone.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {series.map(item => (
            <Card key={item.id} className="border-red-200 shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <img src={item.coverUrl} alt={item.title} className="h-24 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.mangakaName ?? 'Không rõ mangaka'}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {item.currentRank > 0 && (
                      <span className="font-semibold text-red-700">Hạng #{item.currentRank}</span>
                    )}
                    {item.voteScore > 0 && (
                      <span className="text-muted-foreground">{item.voteScore.toLocaleString()} phiếu</span>
                    )}
                    <span className="text-red-600 font-medium">Xếp hạng thấp — cần quyết định</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.synopsis}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/board/series-decisions/${item.id}`)}>
                    <Gavel className="mr-1 h-4 w-4" /> Chi tiết
                  </Button>
                  <Button size="sm" variant="outline" disabled={submittingId === item.id} onClick={() => decide(item.id, 'continue')}>Tiếp tục</Button>
                  <Button size="sm" variant="outline" disabled={submittingId === item.id} onClick={() => decide(item.id, 'monthly')}>Monthly</Button>
                  <Button size="sm" variant="outline" disabled={submittingId === item.id} onClick={() => decide(item.id, 'hiatus')}>Tạm dừng</Button>
                  <Button size="sm" variant="destructive" disabled={submittingId === item.id} onClick={() => decide(item.id, 'cancel')}>Hủy</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-4">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-muted-foreground">Chỉ series đang publishing và có xếp hạng danger zone mới nhận được quyết định.</p>
      </div>
    </div>
  );
}
