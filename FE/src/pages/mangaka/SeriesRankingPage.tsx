import { useEffect, useId } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Star, AlertTriangle } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getSeriesById, getRankingBySeriesId } from '../../data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { clsx } from 'clsx';

export default function SeriesRankingPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const gradientId = useId().replace(/:/g, '');
  const series = getSeriesById(seriesId ?? '');
  const ranking = getRankingBySeriesId(seriesId ?? '');

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

  if (!series || !ranking) {
    return (
      <div className="p-6">
        <EmptyState title="Chưa có dữ liệu xếp hạng" description="Series này chưa có dữ liệu xếp hạng." />
      </div>
    );
  }

  const delta = ranking.previousRank - ranking.currentRank;
  const isUp = delta > 0;
  const isDown = delta < 0;

  const chartData = ranking.history.map(h => ({ ...h, invertedRank: -h.rank }));

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/mangaka/series/${seriesId}`)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">{series.title} — Xếp hạng</h1>
          <p className="text-sm text-muted-foreground">{series.genre} · {series.publishingType}</p>
        </div>
      </div>

      {ranking.isAtRisk && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-1">Series có nguy cơ</p>
            <p className="text-sm text-red-700 leading-relaxed">
              <strong>{series.title}</strong> đã giảm từ hạng #{ranking.history[0].rank} xuống #{ranking.currentRank} trong 8 tuần.
              Nếu xu hướng này tiếp tục, series có thể bị tạm dừng. Hãy cân nhắc nộp chương mới,
              tương tác với phản hồi độc giả hoặc điều chỉnh lịch xuất bản.
            </p>
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Xếp hạng hiện tại',
            value: `#${ranking.currentRank}`,
            sub: `từ #${ranking.previousRank}`,
            color: ranking.isAtRisk ? 'text-red-600' : 'text-foreground',
          },
          {
            label: 'Thay đổi xếp hạng',
            value: delta === 0 ? '—' : `${isUp ? '+' : ''}${delta}`,
            sub: isUp ? 'Cải thiện' : isDown ? 'Giảm' : 'Ổn định',
            color: isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-muted-foreground',
          },
          {
            label: 'Điểm bình chọn',
            value: ranking.voteScore.toLocaleString(),
            sub: 'tuần này',
            color: 'text-foreground',
          },
          {
            label: 'Xu hướng',
            value: ranking.trend === 'up' ? '↑ Tăng' : ranking.trend === 'down' ? '↓ Giảm' : '— Ổn định',
            sub: 'xu hướng 8 tuần',
            color: ranking.trend === 'up' ? 'text-green-600' : ranking.trend === 'down' ? 'text-red-500' : 'text-muted-foreground',
          },
        ].map(stat => (
          <Card key={stat.label}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
            <p className={clsx('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Ranking history chart */}
      <Card>
        <CardHeader><CardTitle>Lịch sử xếp hạng — 8 Tuần</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D72638" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D72638" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C8" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
            <YAxis tick={false} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(_val: any, _name: any, props: any) =>
                props.payload ? [`#${props.payload.rank} (${props.payload.votes.toLocaleString()} phiếu)`, 'Xếp hạng'] : ['', '']
              }
              contentStyle={{ background: '#FFFDF8', border: '1px solid #D8D3C8', borderRadius: '8px', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="invertedRank" stroke="#D72638" strokeWidth={2.5} fill={`url(#${gradientId})`} dot={{ r: 4, fill: '#D72638', strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Vote history chart */}
      <Card>
        <CardHeader><CardTitle>Điểm bình chọn — 8 Tuần</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ranking.history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C8" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, 'Phiếu bầu']}
              contentStyle={{ background: '#FFFDF8', border: '1px solid #D8D3C8', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="votes" fill="#4B3F72" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* History table */}
      <Card padding="none">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-sm uppercase tracking-wide">Lịch sử chi tiết</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Tuần', 'Xếp hạng', 'Thay đổi', 'Phiếu bầu'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ranking.history.slice().reverse().map((h, i, arr) => {
              const prev = arr[i + 1];
              const d = prev ? prev.rank - h.rank : 0;
              return (
                <tr key={h.week} className="hover:bg-muted/20">
                  <td className="px-5 py-3 font-medium">{h.week}</td>
                  <td className="px-5 py-3 font-bold">#{h.rank}</td>
                  <td className={clsx('px-5 py-3 font-semibold flex items-center gap-1',
                    d > 0 ? 'text-green-600' : d < 0 ? 'text-red-500' : 'text-muted-foreground'
                  )}>
                    {d > 0 ? <TrendingUp size={13} /> : d < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                    {d !== 0 ? `${d > 0 ? '+' : ''}${d}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{h.votes.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
