import { Task } from '../../../../types/domain';

interface MangaPagePreviewProps {
  task: Task;
  imageUrl?: string;
}

export function MangaPagePreview({ task, imageUrl }: MangaPagePreviewProps) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Trang ${task.pageNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Trang chưa có ảnh từ backend
          </div>
        )}

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
