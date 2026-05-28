import { Task } from '../../../../data/mockData';

interface MangaPagePreviewProps {
  task: Task;
  imageUrl?: string;
}

export function MangaPagePreview({ task, imageUrl }: MangaPagePreviewProps) {
  // Mock manga page URL nếu không có
  const defaultImageUrl = 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=600&h=850&fit=crop&auto=format';

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
        <img
          src={imageUrl || defaultImageUrl}
          alt={`Trang ${task.pageNumber}`}
          className="w-full h-full object-cover"
        />

        {/* Region Overlay - vùng được giao */}
        <div
          className="absolute border-2 border-primary bg-primary/10"
          style={{
            left: `${task.region.x}%`,
            top: `${task.region.y}%`,
            width: `${task.region.width}%`,
            height: `${task.region.height}%`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium rounded">
            Vùng làm việc
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-center text-muted-foreground">
        Trang {task.pageNumber} - {task.chapterTitle}
      </div>
    </div>
  );
}
