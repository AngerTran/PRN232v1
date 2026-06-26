import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { User } from 'lucide-react';
import { clsx } from 'clsx';

export interface BoardMangaCardProps {
  seriesId: string;
  title: string;
  coverUrl?: string;
  mangakaName?: string;
  genre?: string;
  synopsis?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
}

export function BoardMangaCard({
  seriesId,
  title,
  coverUrl,
  mangakaName,
  genre,
  synopsis,
  badge,
  meta,
  footer,
  to,
  onClick,
  className,
}: BoardMangaCardProps) {
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
      className={clsx(
        'bg-card border border-border rounded-2xl overflow-hidden flex flex-col',
        interactive && 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40',
        className
      )}
      data-series-id={seriesId}
    >
      <div className="relative aspect-[3/4] bg-muted overflow-hidden shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className={clsx('w-full h-full object-cover', interactive && 'group-hover:scale-105 transition-transform duration-300')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Chưa có ảnh bìa
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        {badge && <div className="absolute top-3 left-3">{badge}</div>}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1">{title}</h3>
          {mangakaName && (
            <div className="flex items-center gap-1.5 text-xs text-white/85">
              <User size={12} />
              <span className="truncate">{mangakaName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3 min-h-0">
        {genre && <p className="text-xs text-muted-foreground line-clamp-1">{genre}</p>}
        {synopsis && (
          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed flex-1">{synopsis}</p>
        )}
        {meta}
        {footer && (
          <div
            className="pt-3 border-t border-border mt-auto"
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
