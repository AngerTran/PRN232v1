import { useNavigate } from 'react-router';
import { Calendar, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import Badge from './Badge';
import ProgressBar from './ProgressBar';
import type { Chapter } from '../../types/domain';
import { format, isPast, differenceInDays, isValid } from 'date-fns';

interface ChapterCardProps {
  chapter: Chapter;
  seriesId: string;
  onDelete?: (id: string) => void;
  chapterDetailPath?: (chapterId: string) => string;
}

export default function ChapterCard({ chapter, seriesId, onDelete, chapterDetailPath }: ChapterCardProps) {
  const navigate = useNavigate();
  const detailPath = chapterDetailPath?.(chapter.id) ?? `/mangaka/chapters/${chapter.id}`;
  const deadlineDate = chapter.deadline ? new Date(chapter.deadline) : null;
  const hasDeadline = deadlineDate !== null && isValid(deadlineDate);
  const daysLeft = hasDeadline ? differenceInDays(deadlineDate, new Date()) : null;
  const isOverdue = hasDeadline && isPast(deadlineDate) && chapter.status !== 'Published' && chapter.status !== 'Approved';

  return (
    <div
      onClick={() => navigate(detailPath)}
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
    >
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 font-bold text-sm text-muted-foreground">
        {chapter.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ch.{chapter.number}</span>
          <span className="text-foreground font-semibold text-sm truncate">{chapter.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <FileText size={11} />
            {chapter.pagesCount} trang
          </span>
          <span className={clsx(
            'flex items-center gap-1',
            isOverdue ? 'text-red-500 font-semibold' : hasDeadline && daysLeft !== null && daysLeft <= 7 ? 'text-orange-500' : ''
          )}>
            <Calendar size={11} />
            {!hasDeadline
              ? 'Chưa có hạn'
              : isOverdue
              ? `Trễ hạn (${format(deadlineDate, 'dd/MM')})`
              : daysLeft! <= 0
              ? 'Hạn hôm nay'
              : `${format(deadlineDate, 'dd/MM')} · còn ${daysLeft} ngày`}
          </span>
        </div>
        <ProgressBar value={chapter.progress} showLabel />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge status={chapter.status} statusKind="chapter" />
        {onDelete && chapter.status === 'Draft' && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(chapter.id); }}
            title="Xóa chương nháp"
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
