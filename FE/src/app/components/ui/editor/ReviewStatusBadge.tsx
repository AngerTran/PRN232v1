import { ReviewStatus } from '../../../../data/mockData';
import { Badge } from '../badge';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  className?: string;
}

const statusConfig: Record<ReviewStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'Pending': { label: 'Chờ review', variant: 'secondary' },
  'In Review': { label: 'Đang review', variant: 'default' },
  'Approved': { label: 'Đã duyệt', variant: 'default' },
  'Revision Required': { label: 'Yêu cầu sửa', variant: 'destructive' },
};

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
