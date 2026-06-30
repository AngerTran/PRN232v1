import { clsx } from 'clsx';
import type { SeriesStatus, TaskStatus, ChapterStatus, SubmissionStatus } from '../../types/domain';

type AnyStatus = SeriesStatus | TaskStatus | ChapterStatus | SubmissionStatus | string;

const STATUS_STYLES: Record<string, string> = {
  // Series / Chapter statuses — tăng độ tương phản so với nền card
  'Draft': 'bg-slate-100 text-slate-800 border-slate-300',
  'Submitted': 'bg-amber-100 text-amber-900 border-amber-400',
  'Approved': 'bg-emerald-100 text-emerald-900 border-emerald-400',
  'In Progress': 'bg-violet-100 text-violet-900 border-violet-400',
  'Revision Required': 'bg-orange-100 text-orange-900 border-orange-400',
  'At Risk': 'bg-red-100 text-red-800 border-red-400',
  'Completed': 'bg-teal-100 text-teal-900 border-teal-400',
  'Published': 'bg-purple-100 text-purple-900 border-purple-400',
  'Cancelled': 'bg-gray-200 text-gray-800 border-gray-400',
  // Task statuses
  'Pending': 'bg-slate-100 text-slate-800 border-slate-300',
  // Chapter statuses
  'Review': 'bg-yellow-100 text-yellow-900 border-yellow-400',
  // Submission statuses
  'Rejected': 'bg-gray-200 text-gray-800 border-gray-400',
};

/** Dùng trên ảnh bìa series — nền đặc, dễ đọc */
const OVERLAY_STATUS_STYLES: Record<string, string> = {
  'Draft': 'bg-slate-800/95 text-white border-slate-500 shadow-lg',
  'Submitted': 'bg-amber-500/95 text-white border-amber-300 shadow-lg',
  'Approved': 'bg-emerald-600/95 text-white border-emerald-300 shadow-lg',
  'In Progress': 'bg-violet-700/95 text-white border-violet-300 shadow-lg',
  'Revision Required': 'bg-orange-600/95 text-white border-orange-300 shadow-lg',
  'At Risk': 'bg-red-600/95 text-white border-red-300 shadow-lg',
  'Completed': 'bg-teal-600/95 text-white border-teal-300 shadow-lg',
  'Published': 'bg-purple-700/95 text-white border-purple-300 shadow-lg',
  'Cancelled': 'bg-gray-700/95 text-white border-gray-400 shadow-lg',
  'Pending': 'bg-slate-700/95 text-white border-slate-400 shadow-lg',
  'Review': 'bg-yellow-500/95 text-yellow-950 border-yellow-300 shadow-lg',
  'Rejected': 'bg-gray-700/95 text-white border-gray-400 shadow-lg',
};

const OVERLAY_STATUS_DOTS: Record<string, string> = {
  'Draft': 'bg-slate-300',
  'Submitted': 'bg-white',
  'Approved': 'bg-white',
  'In Progress': 'bg-white',
  'Revision Required': 'bg-white',
  'At Risk': 'bg-white',
  'Completed': 'bg-white',
  'Published': 'bg-white',
  'Cancelled': 'bg-white',
  'Pending': 'bg-white',
  'Review': 'bg-yellow-950',
  'Rejected': 'bg-white',
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
  'Submitted': 'Chờ xét duyệt',
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
  variant?: 'default' | 'overlay';
  className?: string;
}

export default function Badge({ status, showDot = true, size = 'sm', variant = 'default', className }: BadgeProps) {
  const style = variant === 'overlay'
    ? (OVERLAY_STATUS_STYLES[status] ?? 'bg-black/80 text-white border-white/30 shadow-lg')
    : (STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border');
  const dot = variant === 'overlay'
    ? (OVERLAY_STATUS_DOTS[status] ?? 'bg-white')
    : (STATUS_DOTS[status] ?? 'bg-muted-foreground');

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold border rounded-full whitespace-nowrap shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-[10px] tracking-wide uppercase' : 'px-3 py-1 text-xs tracking-wide uppercase',
        variant === 'overlay' && 'backdrop-blur-[2px] font-bold',
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
