import { useNavigate } from 'react-router';
import { ExternalLink, CheckCircle, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import Badge from './Badge';
import type { MangaPage } from '../../data/mockData';
import MangaPanelPreview from '../workspace/MangaPanelPreview';

interface MangaPageCardProps {
  page: MangaPage;
}

export default function MangaPageCard({ page }: MangaPageCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative bg-[#F0EBE0] aspect-[3/4] overflow-hidden">
        <MangaPanelPreview layout={page.panelLayout} />
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold bg-foreground/80 text-white px-1.5 py-0.5 rounded">
            P.{page.pageNumber}
          </span>
        </div>
        <button
          onClick={() => navigate(`/mangaka/pages/${page.id}/workspace`)}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg"
        >
          <ExternalLink size={10} />
          Không gian
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Trang {page.pageNumber}</span>
          <Badge status={page.status} />
        </div>
        {page.tasksCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {page.completedTasksCount === page.tasksCount ? (
              <CheckCircle size={12} className="text-green-500 shrink-0" />
            ) : (
              <Circle size={12} className="text-muted-foreground shrink-0" />
            )}
            <span>{page.completedTasksCount}/{page.tasksCount} nhiệm vụ</span>
          </div>
        )}
      </div>
    </div>
  );
}
