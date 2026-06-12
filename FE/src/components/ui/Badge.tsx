import { clsx } from 'clsx';
import type { SeriesStatus, TaskStatus, ChapterStatus, SubmissionStatus } from '../../types/domain';

type AnyStatus = SeriesStatus | TaskStatus | ChapterStatus | SubmissionStatus | string;

const STATUS_STYLES: Record<string, string> = {
  // Series / Chapter statuses
  'Draft': 'bg-[#9CA3AF]/15 text-[#4B5563] border-[#9CA3AF]/40',
  'Submitted': 'bg-[#2563EB]/12 text-[#1D4ED8] border-[#2563EB]/40',
  'Approved': 'bg-[#16A34A]/12 text-[#15803D] border-[#16A34A]/40',
  'In Progress': 'bg-[#4B3F72]/12 text-[#4B3F72] border-[#4B3F72]/40',
  'Revision Required': 'bg-[#F97316]/12 text-[#C2410C] border-[#F97316]/40',
  'At Risk': 'bg-[#DC2626]/12 text-[#DC2626] border-[#DC2626]/40',
  'Completed': 'bg-[#0D9488]/12 text-[#0F766E] border-[#0D9488]/40',
  'Published': 'bg-[#7C3AED]/12 text-[#6D28D9] border-[#7C3AED]/40',
  'Cancelled': 'bg-[#374151]/12 text-[#374151] border-[#374151]/40',
  // Task statuses
  'Pending': 'bg-[#9CA3AF]/15 text-[#4B5563] border-[#9CA3AF]/40',
  // Chapter statuses
  'Review': 'bg-[#F2C94C]/20 text-[#92400E] border-[#F2C94C]/50',
  // Submission statuses
  'Rejected': 'bg-[#374151]/12 text-[#374151] border-[#374151]/40',
};

const STATUS_DOTS: Record<string, string> = {
  'Draft': 'bg-[#9CA3AF]',
  'Submitted': 'bg-[#2563EB]',
  'Approved': 'bg-[#16A34A]',
  'In Progress': 'bg-[#4B3F72]',
  'Revision Required': 'bg-[#F97316]',
  'At Risk': 'bg-[#DC2626]',
  'Completed': 'bg-[#0D9488]',
  'Published': 'bg-[#7C3AED]',
  'Cancelled': 'bg-[#374151]',
  'Pending': 'bg-[#9CA3AF]',
  'Review': 'bg-[#F2C94C]',
  'Rejected': 'bg-[#374151]',
};

const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Bản nháp',
  'Submitted': 'Đã nộp',
  'Approved': 'Đã duyệt',
  'In Progress': 'Đang thực hiện',
  'Revision Required': 'Cần sửa đổi',
  'At Risk': 'Nguy cơ',
  'Completed': 'Đã hoàn thành',
  'Published': 'Đã xuất bản',
  'Cancelled': 'Đã hủy',
  'Pending': 'Chờ duyệt',
  'Review': 'Đang xét duyệt',
  'Rejected': 'Bị từ chối',
};

const TYPE_LABELS: Record<string, string> = {
  'Background': 'Nền',
  'Shading': 'Bóng đổ',
  'Effect': 'Hiệu ứng',
  'Screentone': 'Screentone',
  'Clean Line': 'Nét sạch',
  'Dialogue Edit': 'Sửa hội thoại',
};

interface BadgeProps {
  status: AnyStatus;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ status, showDot = true, size = 'sm', className }: BadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border';
  const dot = STATUS_DOTS[status] ?? 'bg-muted-foreground';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold border rounded-full whitespace-nowrap shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-[10px] tracking-wide uppercase' : 'px-3 py-1 text-xs tracking-wide uppercase',
        style,
        className
      )}
    >
      {showDot && <span className={clsx('rounded-full shrink-0', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', dot)} />}
      {STATUS_LABELS[status as string] ?? status}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const TYPE_STYLES: Record<string, string> = {
    'Background': 'bg-blue-50 text-blue-700 border-blue-200',
    'Shading': 'bg-purple-50 text-purple-700 border-purple-200',
    'Effect': 'bg-orange-50 text-orange-700 border-orange-200',
    'Screentone': 'bg-teal-50 text-teal-700 border-teal-200',
    'Clean Line': 'bg-gray-50 text-gray-700 border-gray-200',
    'Dialogue Edit': 'bg-pink-50 text-pink-700 border-pink-200',
  };
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border rounded-full',
      TYPE_STYLES[type] ?? 'bg-muted text-muted-foreground border-border',
      className
    )}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
