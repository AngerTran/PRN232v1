import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  BarChart2,
  ChevronRight,
  Crown,
  Star,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Series, SeriesRanking } from '../../types/domain';
import { getMySeries, getSeriesRanking, getSeriesRankingTrend, mapUiStatusToApi } from '../../services/seriesApi';

export default function RankingOverviewPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [rankedSeries, setRankedSeries] = useState<Series[]>([]);
  const [trends, setTrends] = useState<Record<string, SeriesRanking>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: 'Xếp hạng' });
  }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    Promise.all([getMySeries(), getSeriesRanking().catch(() => [])])
      .then(async ([list, rankings]) => {
        const rankById = new Map(rankings.map(r => [r.seriesId, r]));
        const merged = list
          .map(s => {
            const r = rankById.get(s.id);
            return r ? { ...s, currentRank: r.rankPosition, voteScore: r.voteCount } : s;
          })
          .filter(s => s.currentRank > 0)
          .sort((a, b) => a.currentRank - b.currentRank);

        const trendEntries = await Promise.all(
          merged.map(async s => {
            const trend = await getSeriesRankingTrend(s.id, mapUiStatusToApi(s.status));
            return trend ? ([s.id, { ...trend, isAtRisk: s.isAtRisk }] as const) : null;
          }),
        );

        if (!isActive) return;
        setRankedSeries(merged);
        setTrends(Object.fromEntries(trendEntries.filter((e): e is [string, SeriesRanking] => e !== null)));
      })
      .catch(() => {
        if (isActive) {
          setRankedSeries([]);
          setTrends({});
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const atRisk = rankedSeries.filter(s => s.isAtRisk);
  const best = rankedSeries[0];
  const totalVotes = rankedSeries.reduce((sum, s) => sum + (s.voteScore || 0), 0);

  return (
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xếp hạng Series</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi hạng và điểm bình chọn của series đang xuất bản.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Đang tải xếp hạng…
        </div>
      ) : rankedSeries.length === 0 ? (
        <EmptyState
          icon={<BarChart2 size={24} />}
          title="Chưa có dữ liệu xếp hạng"
          description="Xuất bản series để xem dữ liệu xếp hạng."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <SummaryTile
              label="Hạng tốt nhất"
              value={best ? `#${best.currentRank}` : '—'}
              detail={best?.title}
              icon={<Crown size={18} />}
              iconClass="bg-amber-100 text-amber-700"
            />
            <SummaryTile
              label="Series có hạng"
              value={String(rankedSeries.length)}
              detail="Đang theo dõi"
              icon={<BarChart2 size={18} />}
              iconClass="bg-violet-100 text-violet-700"
            />
            <SummaryTile
              label="Tổng phiếu bầu"
              value={totalVotes.toLocaleString()}
              detail="Kỳ hiện tại"
              icon={<Star size={18} />}
              iconClass="bg-emerald-100 text-emerald-700"
            />
            <SummaryTile
              label="Cần theo dõi"
              value={String(atRisk.length)}
              detail={atRisk.length > 0 ? 'Có nguy cơ' : 'Ổn định'}
              icon={<AlertTriangle size={18} />}
              iconClass={atRisk.length > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}
              className={atRisk.length > 0 ? 'border-red-200 bg-red-50/50' : undefined}
            />
          </div>

          {atRisk.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800 leading-relaxed">
                {atRisk.map(s => s.title).join(', ')} đang ở vùng nguy hiểm — cần theo dõi sát xếp hạng.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
            {rankedSeries.map(s => {
              const ranking = trends[s.id];
              if (!ranking) return null;
              return (
                <SeriesRankCard
                  key={s.id}
                  series={s}
                  ranking={ranking}
                  onOpen={() => navigate(`/mangaka/series/${s.id}/ranking`)}
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
  detail,
  icon,
  iconClass,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
  iconClass: string;
  className?: string;
}) {
  return (
    <div className={clsx('rounded-2xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight truncate">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground truncate">{detail}</p>}
        </div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SeriesRankCard({
  series,
  ranking,
  onOpen,
}: {
  series: Series;
  ranking: SeriesRanking;
  onOpen: () => void;
}) {
  const delta = ranking.previousRank - ranking.currentRank;
  const spark = ranking.history.map(h => ({ ...h, inv: -h.rank }));

  return (
    <article
      className={clsx(
        'group flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden transition-all duration-150',
        'hover:shadow-md hover:border-foreground/15',
        ranking.isAtRisk ? 'border-red-200' : 'border-border',
      )}
    >
      <div className="flex gap-3.5 p-4 sm:p-5">
        <div className="relative shrink-0">
          <div className="h-[4.75rem] w-14 overflow-hidden rounded-xl bg-muted ring-1 ring-border/60">
            <img src={series.coverUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <span
            className={clsx(
              'absolute -bottom-1.5 -right-1.5 inline-flex min-w-[2rem] items-center justify-center rounded-lg px-1.5 py-0.5 text-xs font-bold shadow-sm',
              ranking.isAtRisk ? 'bg-red-600 text-white' : 'bg-foreground text-background',
            )}
          >
            #{ranking.currentRank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm sm:text-base leading-snug truncate">{series.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{series.genre}</p>
            </div>
            <DeltaBadge delta={delta} />
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phiếu bầu</p>
              <p className="text-xl font-bold tabular-nums">{ranking.voteScore.toLocaleString()}</p>
            </div>
            {spark.length > 0 && (
              <div className="h-10 w-24 sm:w-28 opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark}>
                    <Line
                      type="monotone"
                      dataKey="inv"
                      stroke={ranking.isAtRisk ? '#DC2626' : '#D72638'}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {ranking.isAtRisk && (
        <div className="mx-4 sm:mx-5 mb-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-medium text-red-700">
          <AlertTriangle size={13} className="shrink-0" />
          Series đang ở vùng nguy hiểm
        </div>
      )}

      <div className="mt-auto border-t border-border/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-2 bg-muted/25">
        <p className="text-xs text-muted-foreground">
          Tuần trước: <span className="font-semibold text-foreground">#{ranking.previousRank}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onOpen} className="gap-1 text-primary hover:text-primary">
          Chi tiết
          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </article>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        <TrendingUp size={12} />+{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
        <TrendingDown size={12} />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
      <Minus size={12} />
      Ổn định
    </span>
  );
}
