import { Series, currentUser } from '../../../../data/mockData';
import { Card, CardContent } from '../card';
import { Badge } from '../badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SeriesSummaryCardProps {
  series: Series;
  onClick?: () => void;
}

export function SeriesSummaryCard({ series, onClick }: SeriesSummaryCardProps) {
  const rankChange = series.previousRank - series.currentRank;
  const isRising = rankChange > 0;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <img
            src={series.coverUrl}
            alt={series.title}
            className="w-20 h-28 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{series.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{currentUser.name}</p>

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{series.genre}</Badge>
              {series.isAtRisk && (
                <Badge variant="destructive">At Risk</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Rank:</span>
                <span className="font-semibold">#{series.currentRank}</span>
                {rankChange !== 0 && (
                  <span className={`flex items-center ${isRising ? 'text-green-600' : 'text-red-600'}`}>
                    {isRising ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(rankChange)}
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Chapters:</span>{' '}
                <span className="font-medium">{series.chaptersCount}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
