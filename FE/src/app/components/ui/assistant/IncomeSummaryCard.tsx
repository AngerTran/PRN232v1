import { Card, CardContent, CardHeader, CardTitle } from '../card';
import { LucideIcon } from 'lucide-react';

interface IncomeSummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  compact?: boolean;
}

export function IncomeSummaryCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendValue,
  compact = false,
}: IncomeSummaryCardProps) {
  return (
    <Card className={compact ? 'shadow-none' : undefined}>
      <CardHeader
        className={`flex flex-row items-center justify-between space-y-0 ${
          compact ? 'px-3 pt-3 pb-1' : 'pb-2'
        }`}
      >
        <CardTitle className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
          {title}
        </CardTitle>
        <Icon className={`text-muted-foreground ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      </CardHeader>
      <CardContent className={compact ? 'px-3 pb-3 pt-0' : undefined}>
        <div className={`font-bold tabular-nums ${compact ? 'text-base leading-tight' : 'text-2xl'}`}>
          {value}
        </div>
        {description && (
          <p className={`text-muted-foreground ${compact ? 'text-[11px] mt-0.5 leading-snug' : 'text-xs mt-1'}`}>
            {description}
          </p>
        )}
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-1.5">
            <span
              className={`text-xs font-medium ${
                trend === 'up'
                  ? 'text-green-600'
                  : trend === 'down'
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              }`}
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
