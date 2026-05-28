import { RiskLevel } from '../../../../data/mockData';
import { Badge } from '../badge';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  'None': { label: 'Ổn định', className: 'bg-green-100 text-green-800 border-green-200' },
  'Low': { label: 'Thấp', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Medium': { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'High': { label: 'Cao', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  'Critical': { label: 'Nghiêm trọng', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <Badge variant="outline" className={`${config.className} ${className || ''}`}>
      {config.label}
    </Badge>
  );
}
