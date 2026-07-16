import type {
  ChapterStatus,
  PageStatus,
  ReviewStatus,
  SeriesStatus,
  TaskStatus,
} from '../types/domain';

/** Nhãn tiếng Việt cho trạng thái series (workflow mangaka / hội đồng). */
export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
  Draft: 'Bản nháp',
  Submitted: 'Chờ xét duyệt',
  Approved: 'Đã duyệt',
  'In Progress': 'Đang xuất bản',
  'Revision Required': 'Cần sửa đổi',
  'At Risk': 'Nguy cơ',
  Completed: 'Sẵn sàng XB',
  Published: 'Đã xuất bản',
  Cancelled: 'Đã từ chối',
};

/** Thứ tự hiển thị trong bộ lọc series của mangaka. */
export const SERIES_STATUS_FILTER_OPTIONS: SeriesStatus[] = [
  'Draft',
  'Submitted',
  'Approved',
  'In Progress',
  'Revision Required',
  'At Risk',
  'Completed',
  'Published',
  'Cancelled',
];

export const CHAPTER_STATUS_LABELS: Record<ChapterStatus, string> = {
  Draft: 'Bản nháp',
  'In Progress': 'Đang thực hiện',
  Review: 'Đang xét duyệt',
  Approved: 'Đã duyệt',
  Published: 'Đã xuất bản',
};

export const CHAPTER_STATUS_FILTER_OPTIONS: ChapterStatus[] = [
  'Draft',
  'In Progress',
  'Review',
  'Approved',
  'Published',
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: 'Chờ nhận',
  'In Progress': 'Đang làm',
  Submitted: 'Đã nộp',
  Approved: 'Đã duyệt',
  'Revision Required': 'Cần chỉnh sửa',
};

export const TASK_STATUS_FILTER_OPTIONS: TaskStatus[] = [
  'Pending',
  'In Progress',
  'Submitted',
  'Approved',
  'Revision Required',
];

export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  Draft: 'Bản nháp',
  'In Progress': 'Đang vẽ',
  Completed: 'Sẵn sàng XB',
  Approved: 'Đã duyệt',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  Pending: 'Chờ xét duyệt',
  'In Review': 'Đang xét duyệt',
  Approved: 'Đã duyệt',
  'Revision Required': 'Cần sửa đổi',
};

/** Gộp cho Badge / hiển thị chung — ưu tiên nhãn cụ thể theo ngữ cảnh workflow. */
export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  ...SERIES_STATUS_LABELS,
  ...CHAPTER_STATUS_LABELS,
  ...PAGE_STATUS_LABELS,
  ...TASK_STATUS_LABELS,
  ...REVIEW_STATUS_LABELS,
  Rejected: 'Bị từ chối',
  'Pending Review': 'Chờ xét duyệt',
  'More Info Required': 'Cần thêm thông tin',
};

export function formatSeriesStatusLabel(status: string): string {
  return SERIES_STATUS_LABELS[status as SeriesStatus] ?? WORKFLOW_STATUS_LABELS[status] ?? status;
}

export function formatChapterStatusLabel(status: string): string {
  return CHAPTER_STATUS_LABELS[status as ChapterStatus] ?? WORKFLOW_STATUS_LABELS[status] ?? status;
}

export function formatTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as TaskStatus] ?? WORKFLOW_STATUS_LABELS[status] ?? status;
}

export function formatPageStatusLabel(status: string): string {
  return PAGE_STATUS_LABELS[status as PageStatus] ?? WORKFLOW_STATUS_LABELS[status] ?? status;
}

export function formatReviewStatusLabel(status: string): string {
  return REVIEW_STATUS_LABELS[status as ReviewStatus] ?? WORKFLOW_STATUS_LABELS[status] ?? status;
}

/** Nhãn mặc định khi không biết loại entity. */
export function formatStatusLabel(status: string): string {
  return WORKFLOW_STATUS_LABELS[status] ?? status;
}

export type StatusEntityKind = 'series' | 'chapter' | 'page' | 'task' | 'review';

export function getStatusLabel(status: string, kind: StatusEntityKind = 'series'): string {
  switch (kind) {
    case 'chapter':
      return formatChapterStatusLabel(status);
    case 'page':
      return formatPageStatusLabel(status);
    case 'task':
      return formatTaskStatusLabel(status);
    case 'review':
      return formatReviewStatusLabel(status);
    case 'series':
    default:
      return formatSeriesStatusLabel(status);
  }
}
