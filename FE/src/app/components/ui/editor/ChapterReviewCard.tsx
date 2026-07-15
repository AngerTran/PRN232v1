import type { Chapter, EditorReview } from '../../../../types/domain';
import { Card, CardContent } from '../card';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { Button } from '../button';
import { BookOpen, CalendarClock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatChapterStatusLabel } from '../../../../utils/statusLabels';

interface ChapterReviewCardProps {
  chapter: Chapter;
  review?: EditorReview;
  seriesTitle?: string;
  coverUrl?: string | null;
  onReview?: () => void;
}

function chapterStatusChip(status: Chapter['status']): string {
  switch (status) {
    case 'Review':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'In Progress':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function ChapterReviewCard({
  chapter,
  review,
  seriesTitle,
  coverUrl,
  onReview,
}: ChapterReviewCardProps) {
  const deadline = new Date(chapter.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;
  const progress = Math.max(0, Math.min(100, chapter.progress ?? 0));

  return (
    <Card className="group w-full max-w-[232px] overflow-hidden border-border/80 shadow-sm transition-all hover:shadow-md hover:border-primary/25">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onReview}
          className="relative block w-full aspect-[2/3] bg-muted overflow-hidden text-left"
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={seriesTitle ?? chapter.title}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-b from-muted to-muted/60">
              <BookOpen className="h-9 w-9 opacity-35" />
              <span className="text-xs">Chưa có ảnh bìa</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          <span className="absolute left-2.5 bottom-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            Ch.{chapter.number}
          </span>
          <span
            className={`absolute right-2.5 top-2.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${chapterStatusChip(chapter.status)}`}
          >
            {formatChapterStatusLabel(chapter.status)}
          </span>
        </button>

        <div className="flex flex-col gap-2 p-2.5">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-start justify-between gap-1.5">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{chapter.title}</h3>
              {review && <ReviewStatusBadge status={review.status} />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{seriesTitle ?? 'Series'}</p>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                isOverdue ? 'text-destructive' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'
              }`}
            >
              <CalendarClock className="h-3 w-3 shrink-0" />
              {isOverdue ? `Trễ ${Math.abs(daysUntil)}d` : `${daysUntil}d`}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{progress}%</span>
          </div>

          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {review && review.annotationsCount > 0 && (
            <p className="text-[11px] text-muted-foreground">{review.annotationsCount} annotations</p>
          )}

          <Button size="sm" className="w-full h-8 text-xs" onClick={onReview}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            {review ? 'Xem Review' : 'Review'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
