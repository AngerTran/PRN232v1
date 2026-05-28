import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import RankingTrend from '../../components/ui/RankingTrend';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { usePageMeta } from '../../hooks/usePageMeta';
import { rankings, series } from '../../data/mockData';
import { BarChart2 } from 'lucide-react';

export default function RankingOverviewPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  useEffect(() => { setPageMeta({ title: 'Xếp hạng' }); }, []);

  const rankedSeries = series
    .filter(s => s.currentRank > 0)
    .sort((a, b) => a.currentRank - b.currentRank);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold">Xếp hạng Series</h1>

      {rankedSeries.length === 0 ? (
        <EmptyState icon={<BarChart2 size={24} />} title="Chưa có dữ liệu xếp hạng" description="Xuất bản series để xem dữ liệu xếp hạng." />
      ) : (
        <>
          {/* At-risk alert */}
          {rankedSeries.some(s => s.isAtRisk) && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <AlertTriangle size={20} className="text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-800">
                {rankedSeries.filter(s => s.isAtRisk).map(s => s.title).join(', ')} đang có nguy cơ bị hủy.
              </p>
            </div>
          )}

          {/* Rankings grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rankedSeries.map(s => {
              const ranking = rankings.find(r => r.seriesId === s.id);
              if (!ranking) return null;
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-10 rounded-lg overflow-hidden">
                        <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.genre}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${s.id}/ranking`)}>
                      Chi tiết
                    </Button>
                  </div>
                  <RankingTrend ranking={ranking} compact />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
