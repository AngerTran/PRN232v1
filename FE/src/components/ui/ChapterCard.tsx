import { useNavigate } from 'react-router';
import { Calendar, FileText, ChevronRight, Trash2, CheckCircle2 } from 'lucide-react';
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

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d : null;
}

export default function ChapterCard({ chapter, seriesId, onDelete, chapterDetailPath }: ChapterCardProps) {
  const navigate = useNavigate();
  const detailPath = chapterDetailPath?.(chapter.id) ?? `/mangaka/chapters/${chapter.id}`;
  const deadlineDate = parseDate(chapter.deadline);
  const completedDate = parseDate(chapter.updatedAt) ?? parseDate(chapter.createdAt);
  const isDone = chapter.status === 'Approved' || chapter.status === 'Published';
  const daysLeft = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null;
  const isOverdue = Boolean(deadlineDate && !isDone && isPast(deadlineDate));
  const showCountdown = Boolean(deadlineDate && !isDone);

  let metaIcon = <Calendar size={11} />;
  let metaLabel = 'Chưa có hạn';
  let metaClass = '';

  if (isDone) {
    metaIcon = <CheckCircle2 size={11} />;
    metaLabel = completedDate
      ? `Hoàn thành ${format(completedDate, 'dd/MM')}`
      : 'Đã hoàn thành';
    metaClass = 'text-emerald-700';
  } else if (!deadlineDate) {
    metaLabel = 'Chưa có hạn';
  } else if (isOverdue) {
    metaLabel = `Trễ hạn (${format(deadlineDate, 'dd/MM')})`;
    metaClass = 'text-red-500 font-semibold';
  } else if (daysLeft! <= 0) {
    metaLabel = 'Hạn hôm nay';
    metaClass = 'text-orange-500';
  } else {
    metaLabel = `${format(deadlineDate, 'dd/MM')} · còn ${daysLeft} ngày`;
    if (daysLeft! <= 7) metaClass = 'text-orange-500';
  }

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
        <div className={clsx(
          'flex items-center gap-3 text-xs text-muted-foreground',
          (chapter.totalTasks ?? 0) > 0 && 'mb-2',
        )}>
          <span className="flex items-center gap-1">
            <FileText size={11} />
            {chapter.pagesCount} trang
          </span>
          <span className={clsx('flex items-center gap-1', metaClass)}>
            {metaIcon}
            {metaLabel}
          </span>
        </div>
        {(chapter.totalTasks ?? 0) > 0 && (
          <ProgressBar value={chapter.progress} showLabel />
        )}
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
