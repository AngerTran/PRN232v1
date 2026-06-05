import { useNavigate } from 'react-router';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import Badge from './Badge';
import MangaPanelPreview from '../workspace/MangaPanelPreview';

interface MangaPageCardProps {
  page: {
    id: string;
    pageNumber: number;
    status: string;
    tasksCount?: number;
    completedTasksCount?: number;
    panelLayout?: number;
    thumbnailUrl?: string;
  };
  onDelete?: (id: string) => void;
}

export default function MangaPageCard({ page, onDelete }: MangaPageCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/mangaka/pages/${page.id}/workspace`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/mangaka/pages/${page.id}/workspace`);
        }
      }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/40 transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative bg-[#F0EBE0] aspect-[3/4] overflow-hidden">
        {page.thumbnailUrl ? (
          <img src={page.thumbnailUrl} alt={`Trang ${page.pageNumber}`} className="w-full h-full object-cover" />
        ) : (
          <MangaPanelPreview layout={page.panelLayout ?? 0} />
        )}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold bg-foreground/80 text-white px-1.5 py-0.5 rounded">
            P.{page.pageNumber}
          </span>
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(page.id); }}
            title="Xóa trang"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 bg-red-600/90 hover:bg-red-600 text-white rounded-lg"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-foreground truncate min-w-0">Trang {page.pageNumber}</span>
          <Badge status={page.status} className="normal-case tracking-normal" />
        </div>
        {(page.tasksCount ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(page.completedTasksCount ?? 0) === page.tasksCount ? (
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
