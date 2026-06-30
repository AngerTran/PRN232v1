import { useNavigate } from 'react-router';
import { BookOpen, TrendingUp, TrendingDown, Minus, Star, ChevronRight, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import Badge from './Badge';
import type { Series } from '../../types/domain';

interface SeriesCardProps {
  series: Series;
  view?: 'grid' | 'list';
  onDelete?: (id: string) => void;
}

export default function SeriesCard({ series, view = 'grid', onDelete }: SeriesCardProps) {
  const navigate = useNavigate();

  const rankDelta = series.previousRank - series.currentRank;
  const trendIcon =
    rankDelta > 0 ? <TrendingUp size={13} className="text-green-600" /> :
    rankDelta < 0 ? <TrendingDown size={13} className="text-red-500" /> :
    <Minus size={13} className="text-muted-foreground" />;

  if (view === 'list') {
    return (
      <div
        onClick={() => navigate(`/mangaka/series/${series.id}`)}
        className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
      >
        <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
          <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{series.title}</h3>
            {series.isAtRisk && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded-full shrink-0">Nguy cơ</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{series.genre}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{series.chaptersCount} chương · {series.publishingType}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge status={series.status} />
          {series.currentRank > 0 && (
            <div className="flex items-center gap-1 text-xs">
              {trendIcon}
              <span className="font-semibold">#{series.currentRank}</span>
            </div>
          )}
          {onDelete && series.status === 'Draft' && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(series.id); }}
              title="Xóa bản nháp"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/mangaka/series/${series.id}`)}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 z-10">
          <Badge status={series.status} variant="overlay" size="md" />
        </div>
        {series.isAtRisk && (
          <div className="absolute top-3 right-3">
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-600 text-white rounded-full">Nguy cơ</span>
          </div>
        )}
        {onDelete && series.status === 'Draft' && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(series.id); }}
            title="Xóa bản nháp"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-7 h-7 bg-red-600/90 hover:bg-red-600 text-white rounded-lg"
          >
            <Trash2 size={13} />
          </button>
        )}
        {series.currentRank > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-lg text-xs">
            <Star size={10} className="fill-accent text-accent" />
            <span className="font-bold">#{series.currentRank}</span>
            {trendIcon && <span className="ml-0.5">{trendIcon}</span>}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">{series.title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{series.genre}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} />
            <span>{series.chaptersCount} chương</span>
          </div>
          <span className="text-muted-foreground">{series.publishingType}</span>
        </div>
        {series.voteScore > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Phiếu bầu</span>
            <span className="text-xs font-semibold text-foreground">{series.voteScore.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
