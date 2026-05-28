import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { getSeriesDecisions } from '../../data/mockData';
import { AlertTriangle, TrendingDown, Gavel } from 'lucide-react';
import { clsx } from 'clsx';

export default function SeriesDecisionPage() {
  usePageMeta({ title: 'Quyết Định Series' });
  const navigate = useNavigate();
  const decisions = getSeriesDecisions();

  const riskColors = [
    { weeks: 8, label: 'Nghiêm Trọng', color: 'text-red-700 bg-red-100 border-red-300' },
    { weeks: 6, label: 'Cao', color: 'text-orange-700 bg-orange-100 border-orange-300' },
    { weeks: 4, label: 'Trung Bình', color: 'text-amber-700 bg-amber-100 border-amber-300' },
  ];

  const getRiskLevel = (weeks: number) => {
    if (weeks >= 8) return riskColors[0];
    if (weeks >= 6) return riskColors[1];
    return riskColors[2];
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quyết Định Series At Risk</h1>
        <p className="text-muted-foreground mt-1">
          {decisions.length} series đang ở vị trí nguy hiểm cần hội đồng ra quyết định
        </p>
      </div>

      {decisions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Hiện không có series nào cần quyết định
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {decisions.map((d) => {
            const risk = getRiskLevel(d.bottomRankingCount);
            return (
              <Card key={d.id} className={clsx('shadow-sm border', risk.color.includes('red') ? 'border-red-200' : risk.color.includes('orange') ? 'border-orange-200' : 'border-amber-200')}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Cover + Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <img src={d.coverUrl} alt={d.seriesTitle} className="w-14 h-20 object-cover rounded-lg shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-base">{d.seriesTitle}</h3>
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border', risk.color)}>
                            {risk.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{d.mangakaName}</p>

                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Hạng Hiện Tại</p>
                            <p className="font-bold text-red-600 flex items-center gap-1">
                              <TrendingDown className="h-3.5 w-3.5" />
                              #{d.currentRank}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tuần Liên Tiếp</p>
                            <p className="font-bold">{d.bottomRankingCount} tuần</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Vote Mới Nhất</p>
                            <p className="font-bold">{d.latestVoteScore.toLocaleString()}</p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">{d.riskReason}</p>
                      </div>
                    </div>

                    {/* Quick Decision Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        className="w-full md:w-40"
                        onClick={() => navigate(`/board/series-decisions/${d.id}`)}
                      >
                        <Gavel className="h-4 w-4 mr-1.5" />
                        Quyết Định
                      </Button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 text-xs">
                          Tiếp Tục
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50 text-xs">
                          Hủy
                        </Button>
                        <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 hover:bg-violet-50 text-xs">
                          Monthly
                        </Button>
                        <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs">
                          Tạm Dừng
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/50 border">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Series ở hạng cuối 4+ tuần liên tiếp sẽ tự động được đưa vào danh sách quyết định. Nhấn <strong>Quyết Định</strong> để xem chi tiết và biểu quyết.
        </p>
      </div>
    </div>
  );
}
