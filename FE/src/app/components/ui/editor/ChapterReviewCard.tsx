import type { Chapter, EditorReview } from '../../../../data/mockData';
import { Card, CardContent } from '../card';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { Button } from '../button';
import { Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ChapterReviewCardProps {
  chapter: Chapter;
  review?: EditorReview;
  seriesTitle?: string;
  onReview?: () => void;
}

export function ChapterReviewCard({ chapter, review, seriesTitle, onReview }: ChapterReviewCardProps) {
  const deadline = new Date(chapter.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{chapter.title}</h3>
            <p className="text-sm text-muted-foreground">
              {seriesTitle ?? 'Series'} - Chapter {chapter.number}
            </p>
          </div>
          {review && <ReviewStatusBadge status={review.status} />}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Deadline</p>
            <p className={`font-medium ${isOverdue ? 'text-destructive' : isUrgent ? 'text-orange-600' : ''}`}>
              {format(deadline, 'dd/MM/yyyy', { locale: vi })}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOverdue ? `Trễ ${Math.abs(daysUntil)} ngày` : `Còn ${daysUntil} ngày`}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Tiến độ</p>
            <p className="font-medium">{chapter.progress}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div
                className="bg-primary h-1.5 rounded-full"
                style={{ width: `${chapter.progress}%` }}
              />
            </div>
          </div>
        </div>

        {review && review.annotationsCount > 0 && (
          <p className="text-sm text-muted-foreground mt-3">
            {review.annotationsCount} annotations
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={onReview}
        >
          <Eye className="h-4 w-4 mr-2" />
          {review ? 'Xem Review' : 'Bắt đầu Review'}
        </Button>
      </CardContent>
    </Card>
  );
}
