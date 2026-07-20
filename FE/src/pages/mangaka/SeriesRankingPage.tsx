import { useEffect, useId, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Star,
  Activity,
} from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Series, SeriesRanking } from '../../types/domain';
import { getSeries, getSeriesRankingTrend, mapUiStatusToApi } from '../../services/seriesApi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { clsx } from 'clsx';

export default function SeriesRankingPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const gradientId = useId().replace(/:/g, '');
  const [series, setSeries] = useState<Series | null>(null);
  const [ranking, setRanking] = useState<SeriesRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seriesId) return;
    let isActive = true;
    setLoading(true);
    getSeries(seriesId)
      .then(s =>
        Promise.all([
          s,
          getSeriesRankingTrend(seriesId, mapUiStatusToApi(s.status)).catch(() => null),
        ]),
      )
      .then(([s, r]) => {
        if (!isActive) return;
        setSeries(s);
        setRanking(r ? { ...r, isAtRisk: s.isAtRisk } : null);
      })
      .catch(() => {
        if (isActive) {
          setSeries(null);
          setRanking(null);
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [seriesId]);

  useEffect(() => {
    setPageMeta({
      title: 'Xếp hạng',
      breadcrumb: [
        { label: 'Series của tôi', href: '/mangaka/series' },
        { label: series?.title ?? 'Series', href: `/mangaka/series/${seriesId}` },
        { label: 'Xếp hạng' },
      ],
    });
  }, [series?.id]);

  if (loading) {
    return (
      <div className="w-full p-6 lg:p-8 text-sm text-muted-foreground">Đang tải xếp hạng…</div>
    );
  }

  if (!series || !ranking) {
    return (
      <div className="w-full p-6 lg:p-8">
        <EmptyState title="Chưa có dữ liệu xếp hạng" description="Series này chưa có dữ liệu xếp hạng." />
      </div>
    );
  }

  const delta = ranking.previousRank - ranking.currentRank;
  const isUp = delta > 0;
  const isDown = delta < 0;
  const chartData = ranking.history.map(h => ({ ...h, invertedRank: -h.rank }));
  const pointCount = ranking.history.length;
  const barSize = pointCount <= 1 ? 56 : pointCount <= 3 ? 40 : undefined;

  return (
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="relative flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5 lg:p-6">
          <button
            type="button"
            onClick={() => navigate(`/mangaka/series/${seriesId}`)}
            className="sm:hidden self-start p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Quay lại"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(`/mangaka/series/${seriesId}`)}
              className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Quay lại"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="h-24 w-[4.25rem] sm:h-28 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/60">
              <img src={series.coverUrl} alt="" className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Xếp hạng series
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{series.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground truncate">
                {series.genre} · {series.publishingType}
              </p>
              {ranking.isAtRisk && (
                <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                  <AlertTriangle size={12} />
                  Vùng nguy hiểm
                </span>
              )}
            </div>
          </div>

          <div
            className={clsx(
              'sm:self-stretch sm:min-w-[9.5rem] rounded-2xl px-4 py-3.5 flex flex-col justify-center',
              ranking.isAtRisk ? 'bg-red-50 border border-red-100' : 'bg-muted/60 border border-border/60',
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hạng hiện tại</p>
            <p
              className={clsx(
                'text-4xl font-bold tracking-tight tabular-nums',
                ranking.isAtRisk ? 'text-red-600' : 'text-foreground',
              )}
            >
              #{ranking.currentRank}
            </p>
            <div
              className={clsx(
                'mt-1 flex items-center gap-1 text-xs font-semibold',
                isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-muted-foreground',
              )}
            >
              {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : <Minus size={13} />}
              {delta === 0 ? 'Ổn định' : `${isUp ? '+' : ''}${delta} so với tuần trước`}
            </div>
          </div>
        </div>
      </div>

      {ranking.isAtRisk && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-0.5">Series có nguy cơ</p>
            <p className="text-sm text-red-700 leading-relaxed">
              Nếu xếp hạng tiếp tục kém, series có thể bị tạm dừng. Cân nhắc xuất bản chương mới hoặc điều chỉnh lịch.
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'So với tuần trước',
            value: `#${ranking.previousRank}`,
            sub: 'Hạng kỳ trước',
            icon: <Activity size={16} />,
          },
          {
            label: 'Thay đổi',
            value: delta === 0 ? '—' : `${isUp ? '+' : ''}${delta}`,
            sub: isUp ? 'Cải thiện' : isDown ? 'Giảm hạng' : 'Ổn định',
            color: isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : undefined,
            icon: isUp ? <TrendingUp size={16} /> : isDown ? <TrendingDown size={16} /> : <Minus size={16} />,
          },
          {
            label: 'Điểm bình chọn',
            value: ranking.voteScore.toLocaleString(),
            sub: 'Tuần này',
            icon: <Star size={16} />,
          },
          {
            label: 'Xu hướng 8 tuần',
            value: ranking.trend === 'up' ? 'Tăng' : ranking.trend === 'down' ? 'Giảm' : 'Ổn định',
            sub: `${pointCount} kỳ có dữ liệu`,
            color:
              ranking.trend === 'up'
                ? 'text-emerald-600'
                : ranking.trend === 'down'
                  ? 'text-red-500'
                  : undefined,
            icon: <Activity size={16} />,
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <span className="text-muted-foreground/70">{stat.icon}</span>
            </div>
            <p className={clsx('text-2xl font-bold tabular-nums', stat.color)}>{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts — side by side on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Lịch sử xếp hạng</CardTitle>
          </CardHeader>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D72638" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#D72638" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C8" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={false} axisLine={false} tickLine={false} width={8} />
                <Tooltip
                  formatter={(_val: unknown, _name: unknown, props: { payload?: { rank?: number; votes?: number } }) =>
                    props.payload
                      ? [`#${props.payload.rank} (${(props.payload.votes ?? 0).toLocaleString()} phiếu)`, 'Xếp hạng']
                      : ['', '']
                  }
                  contentStyle={{
                    background: '#FFFDF8',
                    border: '1px solid #D8D3C8',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invertedRank"
                  stroke="#D72638"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={{ r: pointCount <= 2 ? 5 : 3.5, fill: '#D72638', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Điểm bình chọn</CardTitle>
          </CardHeader>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ranking.history}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                barCategoryGap={pointCount <= 2 ? '55%' : '28%'}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C8" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    typeof val === 'number' ? val.toLocaleString() : String(val),
                    'Phiếu bầu',
                  ]}
                  contentStyle={{
                    background: '#FFFDF8',
                    border: '1px solid #D8D3C8',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="votes" fill="#4B3F72" radius={[6, 6, 0, 0]} maxBarSize={barSize ?? 64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* History table */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide">Lịch sử chi tiết</h3>
          <span className="text-xs text-muted-foreground">{pointCount} kỳ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Tuần', 'Xếp hạng', 'Thay đổi', 'Phiếu bầu'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranking.history
                .slice()
                .reverse()
                .map((h, i, arr) => {
                  const prev = arr[i + 1];
                  const d = prev ? prev.rank - h.rank : 0;
                  return (
                    <tr key={h.week} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap">{h.week}</td>
                      <td className="px-5 py-3.5 font-bold tabular-nums">#{h.rank}</td>
                      <td
                        className={clsx(
                          'px-5 py-3.5 font-semibold',
                          d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-muted-foreground',
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {d > 0 ? <TrendingUp size={13} /> : d < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                          {d !== 0 ? `${d > 0 ? '+' : ''}${d}` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                        {h.votes.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
