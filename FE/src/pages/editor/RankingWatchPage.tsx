import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../app/components/ui/table';
import {
  currentEditor,
  getSeriesByEditorId,
  getRankingBySeriesId,
} from '../../data/mockData';
import { TrendingUp, TrendingDown, Minus, Eye, Shield } from 'lucide-react';

export default function RankingWatchPage() {
  usePageMeta({ title: 'Ranking Watch' });
  const navigate = useNavigate();

  const series = getSeriesByEditorId(currentEditor.id);

  // Sort by current rank
  const sortedSeries = [...series].sort((a, b) => a.currentRank - b.currentRank);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranking Watch</h1>
        <p className="text-muted-foreground mt-1">
          Theo dõi xếp hạng của {series.length} series
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Prev</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Mangaka</TableHead>
                <TableHead>Vote Score</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSeries.map(s => {
                const ranking = getRankingBySeriesId(s.id);
                const rankChange = s.previousRank - s.currentRank;
                const trend = rankChange > 0 ? 'up' : rankChange < 0 ? 'down' : 'stable';

                return (
                  <TableRow key={s.id} className={s.isAtRisk ? 'bg-orange-50/50' : ''}>
                    <TableCell className="font-bold text-lg">
                      #{s.currentRank}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      #{s.previousRank}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.genre}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">Tanaka Hiroshi</TableCell>
                    <TableCell className="font-medium">
                      {s.voteScore.toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {trend === 'up' && (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">+{rankChange}</span>
                          </>
                        )}
                        {trend === 'down' && (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">{rankChange}</span>
                          </>
                        )}
                        {trend === 'stable' && (
                          <>
                            <Minus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">0</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.isAtRisk ? (
                        <Badge variant="destructive">At Risk</Badge>
                      ) : (
                        <Badge variant="secondary">Ổn định</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/editor/series/${s.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {s.isAtRisk && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/editor/series-defense')}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Defend
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
