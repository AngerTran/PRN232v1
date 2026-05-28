import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, padding = 'md', hover = false, onClick }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-card border border-border rounded-2xl shadow-sm',
        paddings[padding],
        hover && 'cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 hover:border-foreground/20',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={clsx('font-semibold text-foreground text-sm tracking-wide uppercase', className)}>
      {children}
    </h3>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  sub?: string;
  accent?: boolean;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

export function StatCard({ label, value, icon, sub, accent, trend, trendValue, className }: StatCardProps) {
  return (
    <Card className={clsx(accent && 'border-primary/30 bg-primary/5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          <p className={clsx('text-3xl font-bold tracking-tight', accent ? 'text-primary' : 'text-foreground')}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {trend && trendValue && (
            <div className={clsx('flex items-center gap-1 mt-2 text-xs font-semibold', trend === 'up' ? 'text-green-600' : 'text-red-500')}>
              <span>{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx('p-2.5 rounded-xl shrink-0', accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
