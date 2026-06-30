import { useNavigate } from 'react-router';
import { Calendar, AlertTriangle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import ProgressBar from './ProgressBar';
import Badge from './Badge';
import type { Chapter, Series } from '../../types/domain';
import { format, differenceInDays } from 'date-fns';

interface DeadlineCardProps {
  chapter: Chapter & { series?: Series };
  onDelete?: (chapterId: string) => void;
  hint?: string;
}

export default function DeadlineCard({ chapter, onDelete, hint }: DeadlineCardProps) {
  const navigate = useNavigate();
  const daysLeft = differenceInDays(new Date(chapter.deadline), new Date());
  const isUrgent = daysLeft <= 5;
  const isOverdue = daysLeft < 0;

  return (
    <div
      onClick={() => navigate(`/mangaka/chapters/${chapter.id}`)}
      className={clsx(
        'p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all duration-150 hover:-translate-y-0.5',
        isOverdue ? 'bg-red-50 border-red-200' : isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-card border-border'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {chapter.series && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 truncate">
              {chapter.series.title}
            </p>
          )}
          <p className="text-sm font-semibold text-foreground truncate">Ch.{chapter.number} — {chapter.title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onDelete && chapter.status === 'Draft' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(chapter.id); }}
              title="Xóa chương nháp"
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {isUrgent && <AlertTriangle size={13} className={isOverdue ? 'text-red-500' : 'text-orange-500'} />}
          <span className={clsx(
            'text-xs font-bold',
            isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'
          )}>
            {isOverdue ? `Trễ ${Math.abs(daysLeft)} ngày` : daysLeft === 0 ? 'Hạn hôm nay' : `Còn ${daysLeft} ngày`}
          </span>
        </div>
      </div>
      <ProgressBar value={chapter.progress} showLabel className="mb-2" />
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          <span>{format(new Date(chapter.deadline), 'MMM d, yyyy')}</span>
        </div>
        <Badge status={chapter.status} statusKind="chapter" size="sm" />
      </div>
    </div>
  );
}
