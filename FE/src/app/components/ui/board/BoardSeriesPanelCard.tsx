import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { User } from 'lucide-react';
import { clsx } from 'clsx';

export interface BoardSeriesPanelCardProps {
  seriesId: string;
  title: string;
  coverUrl?: string;
  mangakaName?: string;
  meta?: ReactNode;
  footer?: ReactNode;
  to?: string;
  onClick?: () => void;
}

export function BoardSeriesPanelCard({
  seriesId,
  title,
  coverUrl,
  mangakaName,
  meta,
  footer,
  to,
  onClick,
}: BoardSeriesPanelCardProps) {
  const navigate = useNavigate();
  const interactive = Boolean(to || onClick);

  const handleActivate = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleActivate : undefined}
      onKeyDown={
        interactive
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
      data-series-id={seriesId}
      className={clsx(
        'flex gap-3.5 p-3.5 rounded-xl border border-border bg-card h-full min-h-[132px]',
        interactive &&
          'cursor-pointer hover:shadow-md hover:border-primary/25 hover:bg-card/80 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30'
      )}
    >
      <div className="w-[76px] sm:w-[88px] shrink-0 rounded-lg overflow-hidden aspect-[3/4] bg-muted border border-border/60">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
            Chưa có ảnh
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">{title}</h3>
          {mangakaName && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <User size={12} className="shrink-0" />
              <span className="truncate">{mangakaName}</span>
            </p>
          )}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
        </div>
        {footer && (
          <div
            className="pt-2 border-t border-border/50"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            {footer}
          </div>
        )}
      </div>
    </article>
  );
}
