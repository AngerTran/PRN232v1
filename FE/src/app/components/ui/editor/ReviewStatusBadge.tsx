import { ReviewStatus } from '../../../../types/domain';
import { Badge } from '../badge';
import { REVIEW_STATUS_LABELS } from '../../../../utils/statusLabels';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  className?: string;
}

const statusConfig: Record<ReviewStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'Pending': { variant: 'secondary' },
  'In Review': { variant: 'default' },
  'Approved': { variant: 'default' },
  'Revision Required': { variant: 'destructive' },
};

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {REVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}
