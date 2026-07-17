import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  Hand,
  ImageIcon,
  ListChecks,
  MessageSquarePlus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
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
import { getChapter, getSeries, updateChapterStatus, acceptChapterReview } from '../../services/seriesApi';
import { getChapterPages, type WorkspacePageItem } from '../../services/workspaceApi';
import type { Chapter, ChapterStatus, Series } from '../../types/domain';

const ANNOTATION_TYPE_LABELS = Object.fromEntries(
  ANNOTATION_TYPE_OPTIONS.map(option => [option.value, option.label])
) as Record<string, string>;

function chapterStatusStyle(status: ChapterStatus): string {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Review':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'In Progress':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'Published':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function ChapterReviewPage() {
  const { chapterId = '' } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
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
      toast.success('Đã thêm annotation trên trang');
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
      toast.success('Đã xóa annotation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa annotation.');
    }
  };

  const handleApprove = async () => {
    if (!chapter) return;
    if (chapter.status === 'Review' && !chapter.reviewAcceptedAt) {
      toast.error('Hãy nhận xét duyệt trước khi duyệt chương.');
      return;
    }
    const ok = await confirm({
      title: 'Duyệt chapter này?',
      variant: 'success',
      message: (
        <>
          Xác nhận duyệt{' '}
          <span className="font-semibold text-foreground">{chapter.title}</span>
          . Sau khi duyệt bạn sẽ quay lại danh sách Chapter Reviews.
        </>
      ),
      confirmText: 'Duyệt và quay lại',
      cancelText: 'Ở lại',
    });
    if (!ok) return;

    setStatusUpdating(true);
    setError('');
    try {
      const updated = await updateChapterStatus(chapter.id, 'completed');
      setChapter(updated);
      toast.success('Đã duyệt chapter', {
        description: `${updated.title} · ${formatChapterStatusLabel(updated.status)}`,
      });
      navigate('/editor/reviews');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể duyệt chapter.');
      toast.error('Không thể duyệt chapter');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAcceptReview = async () => {
    if (!chapter) return;
    const ok = await confirm({
      title: 'Nhận xét duyệt chương?',
      variant: 'submit',
      message: (
        <>
          Nhận <span className="font-semibold text-foreground">{chapter.title}</span> vào hàng xét duyệt?
          <br />
          <span className="text-xs mt-1 inline-block">
            Sau khi nhận, mangaka không thể thu hồi gửi duyệt nữa.
          </span>
        </>
      ),
      confirmText: 'Nhận xét duyệt',
      cancelText: 'Hủy',
    });
    if (!ok) return;

    setStatusUpdating(true);
    setError('');
    try {
      const updated = await acceptChapterReview(chapter.id);
      setChapter(updated);
      toast.success('Đã nhận xét duyệt chương');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhận xét duyệt.');
      toast.error('Không thể nhận xét duyệt');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!chapter) return;
    if (chapter.status === 'Review' && !chapter.reviewAcceptedAt) {
      toast.error('Hãy nhận xét duyệt trước khi yêu cầu mangaka sửa.');
      return;
    }
    const ok = await confirm({
      title: 'Yêu cầu mangaka sửa?',
      variant: 'submit',
      message: (
        <>
          Chapter sẽ chuyển sang{' '}
          <span className="font-semibold text-foreground">Đang thực hiện</span>. Bạn có thể tiếp tục annotation
          trên trang.
        </>
      ),
      confirmText: 'Gửi yêu cầu sửa',
      cancelText: 'Hủy',
    });
    if (!ok) return;

    setStatusUpdating(true);
    setError('');
    try {
      const updated = await updateChapterStatus(chapter.id, 'in_progress');
      setChapter(updated);
      toast.success('Đã gửi yêu cầu sửa', {
        description: 'Trạng thái chapter: Đang thực hiện',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái chapter.');
      toast.error('Không thể gửi yêu cầu sửa');
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
  const isApproved = chapter.status === 'Approved' || chapter.status === 'Published';
  const needsAcceptReview = chapter.status === 'Review' && !chapter.reviewAcceptedAt;
  const reviewInProgress = chapter.status === 'Review' && Boolean(chapter.reviewAcceptedAt);
  const selectedIndex = Math.max(0, pages.findIndex(p => p.id === selectedPage?.id));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <header className="shrink-0 border-b bg-gradient-to-r from-card via-card to-primary/[0.04] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="mt-0.5 shrink-0"
              onClick={() => navigate('/editor/reviews')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold truncate">{chapter.title}</h1>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chapterStatusStyle(chapter.status)}`}
                >
                  {needsAcceptReview
                    ? 'Chờ nhận xét duyệt'
                    : reviewInProgress
                      ? 'Đang xét duyệt'
                      : formatChapterStatusLabel(chapter.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {series.title} · Chương {chapter.number}
                {pages.length > 0 ? ` · ${pages.length} trang` : ''}
                {selectedPage ? ` · đang xem trang ${selectedPage.pageNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {needsAcceptReview ? (
              <Button size="sm" disabled={statusUpdating} onClick={() => void handleAcceptReview()}>
                <Hand className="h-4 w-4 mr-1" />
                Nhận xét duyệt
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={statusUpdating || chapter.status === 'In Progress' || isApproved}
                  onClick={() => void handleRequestRevision()}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {chapter.status === 'In Progress' ? 'Đang chờ sửa' : 'Yêu cầu sửa'}
                </Button>
                {!isApproved ? (
                  <Button size="sm" disabled={statusUpdating} onClick={() => void handleApprove()}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Duyệt chapter
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => navigate('/editor/reviews')}>
                    <ListChecks className="h-4 w-4 mr-1" />
                    Về danh sách review
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {needsAcceptReview && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950">
            Mangaka đã gửi chương. Bấm <strong>Nhận xét duyệt</strong> để bắt đầu — sau đó mangaka không thu hồi được nữa.
          </div>
        )}
        {isApproved && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
            <span className="inline-flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Chapter đã được duyệt. Có thể yêu cầu sửa lại nếu cần, hoặc quay về danh sách.
            </span>
          </div>
        )}
        {chapter.status === 'In Progress' && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950">
            Đã yêu cầu mangaka chỉnh sửa — annotation trên trang vẫn dùng được bình thường.
          </div>
        )}
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[168px_minmax(0,1fr)_280px]">
        <aside className="border-b lg:border-b-0 lg:border-r overflow-y-auto p-2.5 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between px-1 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trang</p>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {pages.length ? `${selectedIndex + 1}/${pages.length}` : '0'}
            </span>
          </div>
          {pages.length === 0 ? (
            <div className="rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
              Chưa có trang manga.
            </div>
          ) : (
            pages.map(page => {
              const thumb = page.thumbnailUrl || page.imageUrl;
              const active = selectedPage?.id === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedPageId(page.id)}
                  className={`w-full rounded-xl border text-left transition-all overflow-hidden ${
                    active
                      ? 'border-primary bg-card shadow-sm ring-1 ring-primary/20'
                      : 'border-border/80 bg-card/60 hover:bg-card hover:border-border'
                  }`}
                >
                  <div className="aspect-[3/2] bg-muted/60 relative">
                    {thumb ? (
                      <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {page.pageNumber}
                    </span>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-sm font-medium">Trang {page.pageNumber}</p>
                    <p className="text-[11px] text-muted-foreground">{formatPageStatusLabel(page.status)}</p>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        <main className="min-h-[280px] lg:min-h-0 flex flex-col bg-[#1f1f1f]">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-black/25">
            <Button
              variant={isSelecting ? 'default' : 'outline'}
              size="sm"
              className={isSelecting ? '' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}
              onClick={() => (isSelecting ? clearRegion() : startSelecting())}
              disabled={!pageImage}
            >
              <Crosshair className="h-4 w-4 mr-1" />
              {isSelecting ? 'Đang chọn vùng…' : 'Chọn vùng'}
            </Button>
            {region && (
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={clearRegion}>
                <X className="h-4 w-4 mr-1" />
                Bỏ vùng
              </Button>
            )}
            <span className="text-xs text-white/50 ml-auto hidden sm:inline">
              {region ? 'Đã chọn vùng — nhập nhận xét bên phải' : 'Kéo khung trên ảnh để gắn annotation'}
            </span>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
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
          </div>
        </main>

        <aside className="border-t lg:border-t-0 lg:border-l overflow-y-auto p-4 space-y-4 bg-card">
          <section className="rounded-2xl border bg-background/80 p-4 space-y-3 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold">Annotation</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {region ? 'Vùng đã chọn — nhập nhận xét rồi lưu.' : 'Chọn vùng trên ảnh trước khi thêm.'}
              </p>
            </div>
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
              rows={3}
              placeholder="Nhận xét cho vùng đã chọn..."
              className="resize-none"
            />
            <Button
              className="w-full"
              size="sm"
              disabled={!comment.trim() || !region || saving || !selectedPage}
              onClick={handleAddAnnotation}
            >
              <MessageSquarePlus className="h-4 w-4 mr-1" />
              {saving ? 'Đang lưu…' : 'Thêm annotation'}
            </Button>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-semibold">Danh sách</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{annotations.length}</span>
            </div>
            {annotations.length === 0 ? (
              <div className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                Chưa có annotation trên trang này.
              </div>
            ) : (
              <div className="space-y-2">
                {annotations.map(item => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${
                      selectedAnnotationId === item.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background/70 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left flex-1 min-w-0"
                        onClick={() => setSelectedAnnotationId(item.id)}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          {ANNOTATION_TYPE_LABELS[item.annotationType ?? 'content'] ?? item.annotationType ?? 'content'}
                        </p>
                        <p className="text-sm mt-1 leading-snug">{item.content || '—'}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {item.createdByName ?? 'Editor'}
                          {parseAnnotationShape(item.shape) ? ' · có vùng' : ''}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0 h-8 w-8 p-0"
                        onClick={() => handleDeleteAnnotation(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
