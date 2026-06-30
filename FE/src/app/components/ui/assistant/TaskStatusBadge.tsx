import { TaskStatus } from '../../../../types/domain';
import { Badge } from '../badge';
import { TASK_STATUS_LABELS } from '../../../../utils/statusLabels';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig: Record<TaskStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'Pending': { variant: 'secondary' },
  'In Progress': { variant: 'default' },
  'Submitted': { variant: 'outline' },
  'Approved': { variant: 'default' },
  'Revision Required': { variant: 'destructive' },
};

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
