import { forwardRef, useCallback, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { clsx } from 'clsx';
import type { Region } from '../../services/workspaceApi';

export interface RegionMarker {
  id: string;
  region: Region;
  color?: string;
  label?: string;
  selected?: boolean;
}

interface PageRegionCanvasProps {
  imageUrl?: string | null;
  alt?: string;
  markers?: RegionMarker[];
  draftRegion?: Region | null;
  dragRegion?: Region | null;
  isSelecting?: boolean;
  selectedMarkerId?: string | null;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: PointerEvent<HTMLDivElement>) => void;
  onMarkerClick?: (id: string) => void;
  emptyState?: ReactNode;
  className?: string;
}

export function parseAnnotationShape(shape: string): Region | null {
  try {
    const parsed = JSON.parse(shape) as Partial<Region>;
    if (
      typeof parsed.x === 'number'
      && typeof parsed.y === 'number'
      && typeof parsed.width === 'number'
      && typeof parsed.height === 'number'
      && parsed.width > 0
      && parsed.height > 0
    ) {
      return {
        x: parsed.x,
        y: parsed.y,
        width: parsed.width,
        height: parsed.height,
      };
    }
  } catch {
    // ignore invalid shape
  }
  return null;
}

export function regionToShape(region: Region): string {
  return JSON.stringify({
    x: Math.round(region.x * 100) / 100,
    y: Math.round(region.y * 100) / 100,
    width: Math.round(region.width * 100) / 100,
    height: Math.round(region.height * 100) / 100,
  });
}

export function usePageRegionSelection() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<Region | null>(null);

  const getRelativePos = useCallback((e: PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const clearRegion = useCallback(() => {
    setRegion(null);
    setDragStart(null);
    setCurrentDrag(null);
    setIsSelecting(false);
  }, []);

  const startSelecting = useCallback(() => {
    setIsSelecting(true);
    setRegion(null);
    setDragStart(null);
    setCurrentDrag(null);
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isSelecting) return;
    const pos = getRelativePos(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart(pos);
    setCurrentDrag(null);
    e.preventDefault();
  }, [getRelativePos, isSelecting]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isSelecting || !dragStart) return;
    const pos = getRelativePos(e);
    setCurrentDrag({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    });
  }, [dragStart, getRelativePos, isSelecting]);

  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isSelecting || !dragStart) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const pos = getRelativePos(e);
    const next = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    };
    if (next.width > 2 && next.height > 2) {
      setRegion(next);
    }
    setDragStart(null);
    setCurrentDrag(null);
    setIsSelecting(false);
  }, [dragStart, getRelativePos, isSelecting]);

  const handlePointerCancel = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragStart(null);
    setCurrentDrag(null);
    setIsSelecting(false);
  }, []);

  return {
    canvasRef,
    isSelecting,
    region,
    currentDrag,
    setRegion,
    clearRegion,
    startSelecting,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}

function RegionBox({
  region,
  color = '#ef4444',
  selected,
  label,
  onClick,
}: {
  region: Region;
  color?: string;
  selected?: boolean;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}
      className={clsx(
        'absolute border-2 rounded-sm transition-shadow',
        onClick ? 'cursor-pointer' : 'pointer-events-none',
        selected ? 'ring-2 ring-white shadow-lg' : ''
      )}
      style={{
        left: `${region.x}%`,
        top: `${region.y}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
        borderColor: color,
        backgroundColor: `${color}33`,
      }}
      title={label}
    >
      {label && (
        <span
          className="absolute -top-5 left-0 text-[10px] font-semibold px-1 py-0.5 rounded text-white whitespace-nowrap max-w-[120px] truncate"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      )}
    </button>
  );
}

const PageRegionCanvas = forwardRef<HTMLDivElement, PageRegionCanvasProps>(function PageRegionCanvas(
  {
    imageUrl,
    alt = 'Trang manga',
    markers = [],
    draftRegion,
    dragRegion,
    isSelecting = false,
    selectedMarkerId,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onMarkerClick,
    emptyState,
    className,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={clsx(
        // shrink-wrap theo ảnh (đã scale vừa khung) để vùng annotation khớp pixel
        'relative inline-block h-full max-h-full max-w-full select-none touch-none',
        isSelecting && 'cursor-crosshair',
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="block h-full w-auto max-w-full object-contain shadow-lg pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="flex h-64 w-48 items-center justify-center rounded-lg border border-dashed border-gray-500 text-sm text-gray-300">
          {emptyState ?? 'Chưa có ảnh'}
        </div>
      )}

      {imageUrl && markers.map(marker => (
        <RegionBox
          key={marker.id}
          region={marker.region}
          color={marker.color}
          label={marker.label}
          selected={selectedMarkerId === marker.id}
          onClick={onMarkerClick ? () => onMarkerClick(marker.id) : undefined}
        />
      ))}

      {draftRegion && <RegionBox region={draftRegion} color="#22c55e" label="Vùng mới" />}
      {dragRegion && <RegionBox region={dragRegion} color="#f59e0b" />}
    </div>
  );
});

export default PageRegionCanvas;
