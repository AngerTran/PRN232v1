import { useNavigate } from 'react-router';
import { BookOpen, ChevronRight, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import { BoardMangaCard } from '../../app/components/ui/board/BoardMangaCard';
import { PublishingTypeBadge } from '../../app/components/ui/board/BoardStatusBadge';
import type { Series } from '../../types/domain';

interface SeriesCardProps {
  series: Series;
  view?: 'grid' | 'list';
  onDelete?: (id: string) => void;
}

export default function SeriesCard({ series, view = 'grid', onDelete }: SeriesCardProps) {
  const navigate = useNavigate();

  const hasTrend =
    series.currentRank > 0
    && series.previousRank > 0
    && series.previousRank !== series.currentRank;
  const rankDelta = series.previousRank - series.currentRank;

  const publishType =
    series.publishingType?.toLowerCase().includes('month')
      ? 'Monthly' as const
      : series.publishingType
        ? 'Weekly' as const
        : null;

  if (view === 'list') {
    return (
      <div
        onClick={() => navigate(`/mangaka/series/${series.id}`)}
        className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
      >
        <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
          {series.coverUrl ? (
            <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{series.title}</h3>
            {series.isAtRisk && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded-full shrink-0">
                Nguy cơ
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{series.genre}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {series.chaptersCount} chương · {series.publishingType}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge status={series.status} />
          {series.currentRank > 0 && (
            <span className="text-xs font-semibold">#{series.currentRank}</span>
          )}
          {onDelete && series.status === 'Draft' && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete(series.id);
              }}
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
    <BoardMangaCard
      seriesId={series.id}
      title={series.title}
      coverUrl={series.coverUrl}
      mangakaName={series.mangakaName}
      genre={series.genre}
      synopsis={series.synopsis}
      to={`/mangaka/series/${series.id}`}
      badge={
        <div className="flex flex-col gap-1.5 items-start">
          <Badge status={series.status} size="sm" variant="overlay" />
          {series.isAtRisk && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-600 text-white rounded-full">
              Nguy cơ
            </span>
          )}
        </div>
      }
      meta={
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {publishType && <PublishingTypeBadge type={publishType} />}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <BookOpen size={12} />
            {series.chaptersCount} chương
          </span>
          {series.currentRank > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              #{series.currentRank}
              {hasTrend && (
                rankDelta > 0
                  ? <TrendingUp size={12} className="text-green-500" />
                  : <TrendingDown size={12} className="text-red-400" />
              )}
            </span>
          )}
          {series.voteScore > 0 && (
            <span className="text-muted-foreground">{series.voteScore.toLocaleString()} phiếu</span>
          )}
        </div>
      }
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={e => {
              e.stopPropagation();
              navigate(`/mangaka/series/${series.id}`);
            }}
          >
            Xem series
          </Button>
          {onDelete && series.status === 'Draft' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5"
              onClick={e => {
                e.stopPropagation();
                onDelete(series.id);
              }}
              title="Xóa bản nháp"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      }
    />
  );
}
