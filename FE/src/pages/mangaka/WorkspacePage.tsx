import { useState, useRef, useCallback, useEffect, type MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Maximize2, ZoomIn, ZoomOut, RotateCcw, Target, X } from 'lucide-react';
import { clsx } from 'clsx';
import TaskPanel from '../../components/workspace/TaskPanel';
import TaskList from '../../components/workspace/TaskList';
import MangaPanelPreview from '../../components/workspace/MangaPanelPreview';
import Badge from '../../components/ui/Badge';
import { getPageById, getPagesByChapterId, getTasksByPageId, getChapterById } from '../../data/mockData';

interface Region {
  x: number; y: number; width: number; height: number;
}

export default function WorkspacePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const [selectedPageId, setSelectedPageId] = useState(pageId ?? '');
  const [isSelecting, setIsSelecting] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [hoverRegion, setHoverRegion] = useState<Region | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<Region | null>(null);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement>(null);

  const page = getPageById(selectedPageId);
  const chapter = page ? getChapterById(page.chapterId) : undefined;
  const allPages = chapter ? getPagesByChapterId(chapter.id) : [];
  const pageTasks = getTasksByPageId(selectedPageId);

  const getRelativePos = useCallback((e: MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;
    const pos = getRelativePos(e);
    setDragStart(pos);
    setCurrentDrag(null);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !dragStart) return;
    const pos = getRelativePos(e);
    setCurrentDrag({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    });
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !dragStart) return;
    const pos = getRelativePos(e);
    const r = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    };
    if (r.width > 2 && r.height > 2) {
      setRegion(r);
    }
    setDragStart(null);
    setCurrentDrag(null);
    setIsSelecting(false);
  };

  const regionLabel = region
    ? `Region: ${Math.round(region.x)}%,${Math.round(region.y)}% — ${Math.round(region.width)}×${Math.round(region.height)}`
    : undefined;

  const displayRegion = hoverRegion || region || currentDrag;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#1C1C1C' }}>
      {/* Left panel — page thumbnails */}
      <div className="w-[68px] flex flex-col gap-1.5 py-3 px-2 overflow-y-auto bg-[#161616] border-r border-[#2E2E2E] shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2E2E2E] transition-colors mb-2">
          <ChevronLeft size={18} />
        </button>
        {allPages.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPageId(p.id)}
            className={clsx(
              'w-10 h-14 rounded-lg overflow-hidden border-2 transition-all duration-150 shrink-0',
              selectedPageId === p.id ? 'border-primary' : 'border-transparent hover:border-gray-500'
            )}
          >
            <div className="w-full h-full bg-[#F0EBE0]">
              <MangaPanelPreview layout={p.panelLayout} />
            </div>
          </button>
        ))}
      </div>

      {/* Center — canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Canvas toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#252525] border-b border-[#333]">
          <div className="flex items-center gap-2">
            {page && <span className="text-sm font-semibold text-white">Trang {page.pageNumber}</span>}
            {page && <Badge status={page.status} />}
          </div>
          <div className="flex-1" />
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(50, z - 10))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#333] transition-colors">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-gray-400 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#333] transition-colors">
              <ZoomIn size={14} />
            </button>
            <button onClick={() => setZoom(100)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#333] transition-colors">
              <RotateCcw size={14} />
            </button>
          </div>
          <button
            onClick={() => { setIsSelecting(s => !s); if (isSelecting) { setRegion(null); setCurrentDrag(null); } }}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              isSelecting ? 'bg-primary text-white' : 'bg-[#333] text-gray-300 hover:bg-[#444] hover:text-white'
            )}
          >
            <Target size={13} />
            {isSelecting ? 'Đang chọn…' : 'Chọn vùng'}
          </button>
          {region && (
            <button onClick={() => setRegion(null)} className="text-gray-400 hover:text-white transition-colors">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8" style={{ background: '#2B2B2B' }}>
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setDragStart(null); setCurrentDrag(null); }}
            className="relative shadow-2xl"
            style={{
              width: `${(zoom / 100) * 420}px`,
              aspectRatio: '3/4',
              cursor: isSelecting ? 'crosshair' : 'default',
              userSelect: 'none',
            }}
          >
            {/* Manga page */}
            <div className="w-full h-full bg-[#F2EDE0] overflow-hidden">
              {page && <MangaPanelPreview layout={page.panelLayout} />}
            </div>

            {/* Existing task regions */}
            {pageTasks.map(task => (
              <div
                key={task.id}
                className="absolute border-2 border-primary/60 bg-primary/10 pointer-events-none transition-all duration-150"
                style={{
                  left: `${task.region.x}%`,
                  top: `${task.region.y}%`,
                  width: `${task.region.width}%`,
                  height: `${task.region.height}%`,
                }}
              >
                <span className="absolute top-0 left-0 text-[9px] font-bold bg-primary text-white px-1 leading-tight">
                  {task.type.slice(0, 2).toUpperCase()}
                </span>
              </div>
            ))}

            {/* Hover region from task list */}
            {hoverRegion && (
              <div
                className="absolute border-2 border-yellow-400 bg-yellow-400/20 pointer-events-none"
                style={{
                  left: `${hoverRegion.x}%`, top: `${hoverRegion.y}%`,
                  width: `${hoverRegion.width}%`, height: `${hoverRegion.height}%`,
                }}
              />
            )}

            {/* Live drag region */}
            {currentDrag && currentDrag.width > 1 && currentDrag.height > 1 && (
              <div
                className="absolute border-2 border-accent bg-accent/15 pointer-events-none"
                style={{
                  left: `${currentDrag.x}%`, top: `${currentDrag.y}%`,
                  width: `${currentDrag.width}%`, height: `${currentDrag.height}%`,
                }}
              />
            )}

            {/* Confirmed region */}
            {region && !currentDrag && (
              <div
                className="absolute border-2 border-dashed border-accent bg-accent/10 pointer-events-none"
                style={{
                  left: `${region.x}%`, top: `${region.y}%`,
                  width: `${region.width}%`, height: `${region.height}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-[300px] flex flex-col bg-[#1E1E1E] border-l border-[#2E2E2E] shrink-0 overflow-hidden">
        {/* Task panel (form) */}
        <div className="flex-1 overflow-hidden min-h-0 border-b border-[#2E2E2E]">
          <TaskPanel
            hasRegion={!!region}
            onSelectRegion={() => { setIsSelecting(true); setRegion(null); }}
            isSelectingRegion={isSelecting}
            regionLabel={regionLabel}
          />
        </div>

        {/* Task list */}
        <div className="h-[280px] flex flex-col bg-[#1A1A1A] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#2E2E2E] flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Nhiệm vụ Trang ({pageTasks.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TaskList tasks={pageTasks} onHoverTask={setHoverRegion} />
          </div>
        </div>
      </div>
    </div>
  );
}
