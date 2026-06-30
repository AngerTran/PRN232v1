import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle, Crosshair, MessageSquarePlus, RotateCcw, Trash2, X } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Textarea } from '../../app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../app/components/ui/select';
import PageRegionCanvas, {
  parseAnnotationShape,
  regionToShape,
  usePageRegionSelection,
} from '../../components/workspace/PageRegionCanvas';
import { formatChapterStatusLabel, formatPageStatusLabel } from '../../utils/statusLabels';
import {
  ANNOTATION_TYPE_OPTIONS,
  createPageAnnotation,
  deletePageAnnotation,
  getPageAnnotations,
  type PageAnnotation,
} from '../../services/annotationsApi';
import { getChapter, getSeries, updateChapterStatus } from '../../services/seriesApi';
import { getChapterPages, type WorkspacePageItem } from '../../services/workspaceApi';
import type { Chapter, Series } from '../../types/domain';

const ANNOTATION_TYPE_LABELS = Object.fromEntries(
  ANNOTATION_TYPE_OPTIONS.map(option => [option.value, option.label])
) as Record<string, string>;

export default function ChapterReviewPage() {
  const { chapterId = '' } = useParams();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [series, setSeries] = useState<Series | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<WorkspacePageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [annotations, setAnnotations] = useState<PageAnnotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [annotationType, setAnnotationType] = useState('content');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');

  const {
    canvasRef,
    isSelecting,
    region,
    currentDrag,
    clearRegion,
    startSelecting,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = usePageRegionSelection();

  const selectedPage = useMemo(
    () => pages.find(page => page.id === selectedPageId) ?? pages[0],
    [pages, selectedPageId]
  );

  useEffect(() => {
    if (!chapterId) return;

    let active = true;
    setLoading(true);
    setError('');

    getChapter(chapterId)
      .then(async chapterItem => {
        const [seriesItem, pageItems] = await Promise.all([
          getSeries(chapterItem.seriesId),
          getChapterPages(chapterId),
        ]);
        if (!active) return;
        setChapter(chapterItem);
        setSeries(seriesItem);
        setPages(pageItems);
        setSelectedPageId(pageItems[0]?.id ?? '');
        setPageMeta({
          title: `Review · ${chapterItem.title}`,
          breadcrumb: [
            { label: 'Chapter Reviews', href: '/editor/reviews' },
            { label: chapterItem.title },
          ],
        });
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không thể tải chapter review.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chapterId, setPageMeta]);

  useEffect(() => {
    clearRegion();
    setSelectedAnnotationId(null);
  }, [selectedPage?.id, clearRegion]);

  useEffect(() => {
    if (!selectedPage?.id) {
      setAnnotations([]);
      return;
    }

    let active = true;
    getPageAnnotations(selectedPage.id)
      .then(items => {
        if (active) setAnnotations(items);
      })
      .catch(() => {
        if (active) setAnnotations([]);
      });

    return () => {
      active = false;
    };
  }, [selectedPage?.id]);

  const markers = useMemo(
    () =>
      annotations
        .map(item => {
          const parsed = parseAnnotationShape(item.shape);
          if (!parsed) return null;
          return {
            id: item.id,
            region: parsed,
            color: item.color ?? '#ef4444',
            label: ANNOTATION_TYPE_LABELS[item.annotationType ?? 'content'] ?? item.annotationType ?? 'Ghi chú',
            selected: selectedAnnotationId === item.id,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [annotations, selectedAnnotationId]
  );

  const handleAddAnnotation = async () => {
    if (!selectedPage?.id || !comment.trim() || !region) return;
    setSaving(true);
    setError('');
    try {
      const created = await createPageAnnotation(selectedPage.id, {
        annotationType,
        content: comment.trim(),
        shape: regionToShape(region),
      });
      setAnnotations(current => [created, ...current]);
      setComment('');
      clearRegion();
      setSelectedAnnotationId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo annotation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    setError('');
    try {
      await deletePageAnnotation(id);
      setAnnotations(current => current.filter(item => item.id !== id));
      if (selectedAnnotationId === id) setSelectedAnnotationId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa annotation.');
    }
  };

  const handleChapterStatus = async (status: string) => {
    if (!chapter) return;
    setStatusUpdating(true);
    setError('');
    try {
      const updated = await updateChapterStatus(chapter.id, status);
      setChapter(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái chapter.');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải chapter review...</div>;
  }

  if (!chapter || !series) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error || 'Không tìm thấy chapter.'}</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate('/editor/reviews')}>
          Quay lại
        </Button>
      </div>
    );
  }

  const pageImage = selectedPage?.imageUrl || selectedPage?.thumbnailUrl;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/editor/reviews')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{chapter.title}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {series.title} · Chương {chapter.number} · {formatChapterStatusLabel(chapter.status)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={statusUpdating}
            onClick={() => handleChapterStatus('in_progress')}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Yêu cầu sửa
          </Button>
          <Button
            size="sm"
            disabled={statusUpdating}
            onClick={() => handleChapterStatus('completed')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Duyệt chapter
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[180px_1fr_320px]">
        <aside className="border-b lg:border-b-0 lg:border-r overflow-y-auto p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Trang</p>
          {pages.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">Chưa có trang manga.</p>
          ) : (
            pages.map(page => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${
                  selectedPage?.id === page.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                Trang {page.pageNumber}
                <span className="block text-xs text-muted-foreground">{formatPageStatusLabel(page.status)}</span>
              </button>
            ))
          )}
        </aside>

        <main className="min-h-[280px] lg:min-h-0 bg-[#2B2B2B] flex flex-col items-center justify-center p-4 overflow-auto gap-3">
          <div className="flex items-center gap-2 self-start">
            <Button
              variant={isSelecting ? 'default' : 'outline'}
              size="sm"
              className={isSelecting ? '' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}
              onClick={() => (isSelecting ? clearRegion() : startSelecting())}
              disabled={!pageImage}
            >
              <Crosshair className="h-4 w-4 mr-1" />
              {isSelecting ? 'Đang chọn vùng...' : 'Chọn vùng trên trang'}
            </Button>
            {region && (
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={clearRegion}>
                <X className="h-4 w-4 mr-1" />
                Xóa vùng
              </Button>
            )}
          </div>

          <PageRegionCanvas
              ref={canvasRef}
              imageUrl={pageImage}
              alt={`Trang ${selectedPage?.pageNumber ?? ''}`}
              markers={markers}
              draftRegion={region}
              dragRegion={currentDrag}
              isSelecting={isSelecting}
              selectedMarkerId={selectedAnnotationId}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onMarkerClick={setSelectedAnnotationId}
              emptyState="Chưa có ảnh trang để review."
            />
        </main>

        <aside className="border-t lg:border-t-0 lg:border-l overflow-y-auto p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Thêm annotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {region
                  ? 'Đã chọn vùng trên trang — nhập nhận xét và lưu.'
                  : 'Bấm "Chọn vùng trên trang" và kéo khung trên ảnh trước khi thêm.'}
              </p>
              <Select value={annotationType} onValueChange={setAnnotationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Loại annotation" />
                </SelectTrigger>
                <SelectContent>
                  {ANNOTATION_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={comment}
                onChange={event => setComment(event.target.value)}
                rows={4}
                placeholder="Nhận xét cho vùng đã chọn..."
              />
              <Button
                className="w-full"
                size="sm"
                disabled={!comment.trim() || !region || saving || !selectedPage}
                onClick={handleAddAnnotation}
              >
                <MessageSquarePlus className="h-4 w-4 mr-1" />
                Thêm annotation
              </Button>
            </CardContent>
          </Card>

          <div>
            <p className="text-sm font-semibold mb-2">
              Annotations ({annotations.length})
            </p>
            {annotations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có annotation trên trang này.</p>
            ) : (
              <div className="space-y-2">
                {annotations.map(item => (
                  <Card
                    key={item.id}
                    className={selectedAnnotationId === item.id ? 'border-primary shadow-sm' : ''}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="text-left flex-1 min-w-0"
                          onClick={() => setSelectedAnnotationId(item.id)}
                        >
                          <p className="text-xs font-semibold uppercase text-primary">
                            {ANNOTATION_TYPE_LABELS[item.annotationType ?? 'content'] ?? item.annotationType ?? 'content'}
                          </p>
                          <p className="text-sm mt-1">{item.content || '—'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.createdByName ?? 'Editor'}
                            {parseAnnotationShape(item.shape) ? ' · có vùng đánh dấu' : ''}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive shrink-0"
                          onClick={() => handleDeleteAnnotation(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
