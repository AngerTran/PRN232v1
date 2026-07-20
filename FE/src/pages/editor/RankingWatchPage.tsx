import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../app/components/ui/button';
import type { Series } from '../../types/domain';
import { getSeriesRanking, getSeriesRankingTrend, mapUiStatusToApi } from '../../services/seriesApi';
import { getEditorAssignedSeries } from '../../services/editorApi';
import { Eye, Shield, Trophy, AlertTriangle, Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function RankingWatchPage() {
  usePageMeta({ title: 'Ranking Watch' });
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSeries() {
      setIsLoading(true);
      setError(null);

      try {
        const [items, rankings] = await Promise.all([
          getEditorAssignedSeries(),
          getSeriesRanking().catch(() => []),
        ]);
        const rankById = new Map(rankings.map(r => [r.seriesId, r]));
        const merged = await Promise.all(
          items.map(async s => {
            const r = rankById.get(s.id);
            if (!r) return s;
            const trend = await getSeriesRankingTrend(s.id, mapUiStatusToApi(s.status)).catch(() => null);
            return {
              ...s,
              currentRank: r.rankPosition,
              previousRank: trend?.previousRank ?? r.rankPosition,
              voteScore: r.voteCount,
              isAtRisk: trend?.isAtRisk ?? s.isAtRisk,
            };
          }),
        );
        if (isActive) setSeries(merged);
      } catch (err) {
        if (isActive) {
          setSeries([]);
          setError(err instanceof Error ? err.message : 'Không thể tải ranking watch từ backend.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadSeries();
    return () => {
      isActive = false;
    };
  }, []);

  const sortedSeries = [...series].sort((a, b) => {
    const ra = a.currentRank > 0 ? a.currentRank : Number.MAX_SAFE_INTEGER;
    const rb = b.currentRank > 0 ? b.currentRank : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  const atRiskCount = sortedSeries.filter(s => s.isAtRisk).length;

  return (
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ranking Watch</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi xếp hạng {series.length} series phụ trách
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <SummaryTile
          label="Series theo dõi"
          value={String(series.length)}
          icon={<Trophy size={18} />}
          iconClass="bg-amber-100 text-amber-700"
        />
        <SummaryTile
          label="Có hạng"
          value={String(sortedSeries.filter(s => s.currentRank > 0).length)}
          icon={<Star size={18} />}
          iconClass="bg-violet-100 text-violet-700"
        />
        <SummaryTile
          label="Cần theo dõi"
          value={String(atRiskCount)}
          icon={<AlertTriangle size={18} />}
          iconClass={atRiskCount > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}
          className={atRiskCount > 0 ? 'border-red-200 bg-red-50/40 col-span-2 sm:col-span-1' : 'col-span-2 sm:col-span-1'}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border/70 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Bảng xếp hạng</h2>
          <span className="text-xs text-muted-foreground">
            {isLoading ? 'Đang tải…' : `${sortedSeries.length} series`}
          </span>
        </div>

        {isLoading ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Đang tải series…</p>
        ) : error ? (
          <p className="px-5 py-12 text-center text-sm text-destructive">{error}</p>
        ) : sortedSeries.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Không có series nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">
                    Hạng
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20 hidden sm:table-cell">
                    Trước
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Series
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                    Mangaka
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Vote
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rủi ro
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedSeries.map(s => (
                  <tr
                    key={s.id}
                    className={clsx(
                      'hover:bg-muted/25 transition-colors',
                      s.isAtRisk && 'bg-red-50/40',
                    )}
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <span
                        className={clsx(
                          'inline-flex min-w-[2.25rem] justify-center rounded-lg px-2 py-1 text-sm font-bold tabular-nums',
                          s.currentRank > 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {s.currentRank > 0 ? `#${s.currentRank}` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground tabular-nums hidden sm:table-cell">
                      {s.previousRank > 0 ? `#${s.previousRank}` : '—'}
                    </td>
                    <td className="px-3 py-3.5 min-w-0">
                      <p className="font-semibold truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{s.genre}</p>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground hidden md:table-cell">
                      {s.mangakaName ?? '—'}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums">
                      {s.voteScore > 0 ? s.voteScore.toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      {s.isAtRisk ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Nguy cơ
                        </span>
                      ) : (
                        <span className="inline-flex rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                          Ổn định
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/editor/series/${s.id}`)}
                          title="Xem series"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {s.isAtRisk && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => navigate(`/editor/series-defense?seriesId=${s.id}`)}
                          >
                            <Shield className="h-3.5 w-3.5 mr-1" />
                            Defend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
