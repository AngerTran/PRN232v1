import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SeriesRanking } from '../../data/mockData';

interface RankingTrendProps {
  ranking: SeriesRanking;
  compact?: boolean;
}

export default function RankingTrend({ ranking, compact = false }: RankingTrendProps) {
  const delta = ranking.previousRank - ranking.currentRank;
  const isUp = delta > 0;
  const isDown = delta < 0;

  const chartData = ranking.history.map(h => ({ ...h, invRank: -h.rank }));

  return (
    <div className={clsx('bg-card border border-border rounded-2xl', compact ? 'p-4' : 'p-5')}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Xếp hạng hiện tại</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-foreground">#{ranking.currentRank}</span>
            <div className={clsx(
              'flex items-center gap-1 text-sm font-semibold',
              isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {isUp ? <TrendingUp size={16} /> : isDown ? <TrendingDown size={16} /> : <Minus size={16} />}
              {isUp ? `+${delta}` : `${delta}`}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">từ #{ranking.previousRank} tuần trước</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Điểm bình chọn</p>
          <p className="text-2xl font-bold text-foreground">{ranking.voteScore.toLocaleString()}</p>
        </div>
      </div>

      {ranking.isAtRisk && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="font-semibold">Nguy cơ — Series có thể bị tạm dừng nếu xếp hạng tiếp tục giảm.</span>
        </div>
      )}

      {!compact && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Xu hướng 8 tuần</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={false} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(_val: any, _name: any, props: any) => [
                  props.payload ? `#${props.payload.rank} (${props.payload.votes.toLocaleString()} phiếu)` : '',
                  'Hạng'
                ]}
                contentStyle={{ background: '#FFFDF8', border: '1px solid #D8D3C8', borderRadius: '8px', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="invRank"
                stroke="#D72638"
                strokeWidth={2}
                dot={{ r: 3, fill: '#D72638' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {ranking.history.slice(-3).reverse().map(h => (
              <div key={h.week} className="bg-muted rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{h.week}</p>
                <p className="text-sm font-bold text-foreground">#{h.rank}</p>
                <p className="text-[10px] text-muted-foreground">{h.votes.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
