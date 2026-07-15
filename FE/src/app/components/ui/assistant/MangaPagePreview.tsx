import { Task } from '../../../../types/domain';

interface MangaPagePreviewProps {
  task: Task;
  imageUrl?: string;
}

export function MangaPagePreview({ task, imageUrl }: MangaPagePreviewProps) {
  return (
    <div className="relative w-full">
      <div className="relative aspect-[3/4] max-h-[420px] mx-auto bg-muted rounded-lg overflow-hidden border border-border/60 shadow-inner">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Trang ${task.pageNumber}`}
            className="w-full h-full object-contain bg-[#1c1c1c]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
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
          <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap">
            Vùng làm việc
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-center text-muted-foreground">
        Trang {task.pageNumber} · {task.chapterTitle}
      </div>
    </div>
  );
}
