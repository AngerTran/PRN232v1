import { TaskStatus } from '../../../../types/domain';
import { Badge } from '../badge';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'Pending': { label: 'Chờ nhận', variant: 'secondary' },
  'In Progress': { label: 'Đang làm', variant: 'default' },
  'Submitted': { label: 'Đã nộp', variant: 'outline' },
  'Approved': { label: 'Đã duyệt', variant: 'default' },
  'Revision Required': { label: 'Cần chỉnh sửa', variant: 'destructive' },
};

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
