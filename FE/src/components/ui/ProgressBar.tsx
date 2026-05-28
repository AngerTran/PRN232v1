import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  color?: 'primary' | 'green' | 'orange' | 'red' | 'purple';
  showLabel?: boolean;
  className?: string;
}

const COLORS = {
  primary: 'bg-primary',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-secondary',
};

function getAutoColor(value: number): string {
  if (value >= 80) return COLORS.green;
  if (value >= 50) return COLORS.primary;
  if (value >= 25) return COLORS.orange;
  return COLORS.red;
}

export default function ProgressBar({ value, size = 'sm', color, showLabel = false, className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const barColor = color ? COLORS[color] : getAutoColor(clampedValue);

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('flex-1 bg-muted rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-muted-foreground w-8 text-right tabular-nums">{clampedValue}%</span>
      )}
    </div>
  );
}
