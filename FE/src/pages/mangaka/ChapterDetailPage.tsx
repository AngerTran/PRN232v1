import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft,
  Calendar,
  FileText,
  Layers,
  Plus,
  FileDown,
  Upload,
  Sparkles,
  CheckCircle2,
  Send,
  Undo2,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardTitle } from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import MangaPageCard from '../../components/ui/MangaPageCard';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useSeriesContentPaths } from '../../hooks/useSeriesContentPaths';
import {
  buildManuscriptDownloadUrl,
  resolveManuscriptFileName,
} from '../../utils/manuscriptDownload';
import type { Chapter, Series } from '../../types/domain';
import {
  getChapter,
  getSeries,
  canMangakaProduceOnSeries,
  canMangakaEditChapter,
  canMangakaSubmitChapterForReview,
  canMangakaWithdrawChapterReview,
  getChapterReviewLockHint,
  SERIES_PRODUCTION_LOCK_HINT,
  uploadChapterManuscript,
  updateChapterStatus,
} from '../../services/seriesApi';
import { getChapterPages, uploadChapterPage, deleteChapterPage, reorderChapterPages, type WorkspacePageItem } from '../../services/workspaceApi';
import { format } from 'date-fns';
import { toast } from 'sonner';

function isManuscriptUrl(value?: string | null): value is string {
  if (!value?.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/45 px-3.5 py-3 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon size={11} />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold truncate">{value}</p>
    </div>
  );
}

export default function ChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<WorkspacePageItem[]>([]);
  const [series, setSeries] = useState<Series | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingManuscript, setUploadingManuscript] = useState(false);
  const [uploadingPages, setUploadingPages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [reorderingPages, setReorderingPages] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [withdrawingReview, setWithdrawingReview] = useState(false);
  const manuscriptInputRef = useRef<HTMLInputElement>(null);

  const paths = useSeriesContentPaths(chapter?.seriesId);
  const readOnly = paths.isBoard;

  useEffect(() => {
    let isActive = true;

    async function loadChapterPages() {
      if (!chapterId) return;

      setIsLoading(true);
      setError(null);

      try {
        const loadedChapter = await getChapter(chapterId);
        const [loadedPages, loadedSeries] = await Promise.all([
          getChapterPages(chapterId),
          getSeries(loadedChapter.seriesId).catch(() => null),
        ]);

        if (isActive) {
          setChapter(loadedChapter);
          setPages(loadedPages);
          setSeries(loadedSeries);
        }
      } catch (err) {
        if (isActive) {
          setChapter(null);
          setPages([]);
          setSeries(null);
          setError(err instanceof Error ? err.message : 'Không thể tải page từ backend.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadChapterPages();

    return () => {
      isActive = false;
    };
  }, [chapterId]);

  useEffect(() => {
    if (chapter) {
      setPageMeta({
        title: chapter.title,
        breadcrumb: [
          paths.breadcrumbRoot,
          { label: series?.title ?? 'Series', href: paths.seriesBase },
          { label: 'Chương', href: paths.chaptersList },
          { label: `Ch.${chapter.number}` },
        ],
      });
    }
  }, [chapter?.id, series?.title, paths.breadcrumbRoot.href, paths.seriesBase, paths.chaptersList]);

  const handleAddPageClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const handleManuscriptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !chapterId) return;
    setUploadingManuscript(true);
    try {
      const updated = await uploadChapterManuscript(chapterId, file);
      setChapter(prev =>
        prev
          ? {
              ...prev,
              description: updated.description,
              manuscriptFileName: updated.manuscriptFileName,
            }
          : updated,
      );
      toast.success(`Đã cập nhật bản thảo: ${updated.manuscriptFileName || file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải bản thảo thất bại');
    } finally {
      setUploadingManuscript(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0 || !chapterId) return;

    // Sắp xếp theo tên file tự nhiên: 0.jpg, 1.jpg, … 10.jpg
    const files = selected.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );

    setUploadingPages(true);
    setUploadProgress({ done: 0, total: files.length });

    let nextPageNumber = pages.length > 0 ? Math.max(...pages.map(p => p.pageNumber)) + 1 : 1;
    const uploaded: WorkspacePageItem[] = [];
    const failures: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const newPage = await uploadChapterPage(chapterId, {
            file,
            pageNumber: nextPageNumber,
          });
          uploaded.push(newPage);
          nextPageNumber += 1;
        } catch (err) {
          failures.push(
            `${file.name}: ${err instanceof Error ? err.message : 'lỗi không xác định'}`,
          );
        }
        setUploadProgress({ done: i + 1, total: files.length });
      }

      if (uploaded.length > 0) {
        setPages(prev => [...prev, ...uploaded].sort((a, b) => a.pageNumber - b.pageNumber));
      }

      if (failures.length === 0) {
        toast.success(
          uploaded.length === 1
            ? 'Đã thêm 1 trang'
            : `Đã thêm ${uploaded.length} trang`,
        );
      } else if (uploaded.length > 0) {
        toast.warning(`Đã thêm ${uploaded.length}/${files.length} trang. Một số file lỗi.`);
      } else {
        toast.error(failures[0] || 'Không thể tải trang lên.');
      }
    } finally {
      setUploadingPages(false);
      setUploadProgress(null);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (readOnly) return;
    const target = pages.find(p => p.id === pageId);
    const confirmed = await confirm({
      title: 'Xóa trang',
      variant: 'danger',
      message: (
        <>
          Bạn có chắc muốn xóa <span className="font-semibold text-foreground">Trang {target?.pageNumber ?? ''}</span>?
          <br />Hành động này không thể hoàn tác.
        </>
      ),
      confirmText: 'Xóa trang',
    });
    if (!confirmed) return;

    const previous = pages;
    setPages(prev => prev.filter(p => p.id !== pageId));
    try {
      await deleteChapterPage(pageId);
    } catch (err) {
      setPages(previous);
      alert(err instanceof Error ? err.message : 'Không thể xóa trang.');
    }
  };

  const handleMovePage = async (pageId: string, direction: 'up' | 'down') => {
    if (readOnly || reorderingPages || !chapterId) return;
    const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
    const index = ordered.findIndex(p => p.id === pageId);
    if (index < 0) return;
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    const pageIds = next.map(p => p.id);

    const previous = pages;
    setPages(
      next.map((p, i) => ({ ...p, pageNumber: i + 1 })),
    );
    setReorderingPages(true);
    try {
      const updated = await reorderChapterPages(chapterId, pageIds);
      setPages(updated);
    } catch (err) {
      setPages(previous);
      toast.error(err instanceof Error ? err.message : 'Không đổi được thứ tự trang.');
    } finally {
      setReorderingPages(false);
    }
  };

  if (isLoading) {
    return <div className="p-6"><EmptyState title="Đang tải chương..." /></div>;
  }

  if (!chapter) {
    if (error) {
      return <div className="p-6"><EmptyState title="Không tải được chương" description={error} /></div>;
    }
    return <div className="p-6"><EmptyState title="Không tìm thấy chương" /></div>;
  }

  const totalTasks = pages.reduce((sum, p) => sum + (p.tasksCount ?? 0), 0);
  const completedTasks = pages.reduce((sum, p) => sum + (p.completedTasksCount ?? 0), 0);
  const completedPages = pages.filter(p => (p.tasksCount ?? 0) > 0 && (p.completedTasksCount ?? 0) === p.tasksCount).length;
  const progress = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : (chapter.status === 'Published' || chapter.status === 'Approved' ? 100 : 0);

  // Không ghi đè status chương bằng tiến độ task — «Đã duyệt» chỉ khi Editor duyệt.
  const displayChapterStatus = chapter.status;
  const displayChapterStatusLabel =
    chapter.status === 'Review' && chapter.reviewAcceptedAt
      ? 'Editor đang xét'
      : chapter.status === 'Review'
        ? 'Chờ Editor nhận'
        : undefined;

  const displayPages = pages.map(p => {
    // Chương đã khóa / XB → trang không còn hiện Bản nháp / sẵn sàng XB giả.
    if (chapter.status === 'Published') return { ...p, status: 'Published' as const };
    if (chapter.status === 'Approved') return { ...p, status: 'Approved' as const };
    if (chapter.status === 'Review') return { ...p, status: 'Review' as const };

    const total = p.tasksCount ?? 0;
    const done = p.completedTasksCount ?? 0;
    if (total > 0 && done === total) return { ...p, status: 'Completed' as const };
    if (total > 0 && done > 0) return { ...p, status: 'In Progress' as const };
    return p;
  });

  const canProduce = !readOnly && series ? canMangakaProduceOnSeries(series.status) : false;
  const canEditChapter = !readOnly && chapter ? canMangakaEditChapter(chapter.status) : false;
  const canEdit = canProduce && canEditChapter;
  const productionLockHint = !readOnly && series ? SERIES_PRODUCTION_LOCK_HINT[series.status] : undefined;
  const chapterLockHint =
    !readOnly && chapter && !canEditChapter
      ? getChapterReviewLockHint(chapter)
      : undefined;
  const canOpenWorkspace = canEdit && pages.length > 0;
  const canSubmitForReview =
    !readOnly
    && canEdit
    && chapter
    && canMangakaSubmitChapterForReview(chapter.status)
    && pages.length > 0;
  const canWithdrawReview =
    !readOnly
    && canProduce
    && chapter
    && canMangakaWithdrawChapterReview(chapter.status, chapter.reviewAcceptedAt);

  const handleSubmitForReview = async () => {
    if (!chapter) return;
    const confirmed = await confirm({
      title: 'Gửi xét duyệt chương',
      variant: 'submit',
      message: (
        <>
          Gửi <span className="font-semibold text-foreground">Ch.{chapter.number} · {chapter.title}</span> cho Editor xét duyệt?
          <br />
          <span className="text-xs mt-1 inline-block">
            Editor mới thấy chương sau bước này. Board chỉ thấy sau khi Editor duyệt xong.
          </span>
        </>
      ),
      confirmText: 'Gửi Editor',
    });
    if (!confirmed) return;

    setSubmittingReview(true);
    try {
      const updated = await updateChapterStatus(chapter.id, 'reviewing');
      setChapter(updated);
      toast.success('Đã gửi chương cho Editor xét duyệt.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không gửi được xét duyệt.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleWithdrawReview = async () => {
    if (!chapter) return;
    const confirmed = await confirm({
      title: 'Thu hồi xét duyệt',
      variant: 'danger',
      message: (
        <>
          Thu hồi <span className="font-semibold text-foreground">Ch.{chapter.number} · {chapter.title}</span> về trạng thái chỉnh sửa?
          <br />
          <span className="text-xs mt-1 inline-block">
            Editor sẽ không còn thấy chương trong hàng chờ cho đến khi bạn gửi lại.
          </span>
        </>
      ),
      confirmText: 'Thu hồi để sửa',
    });
    if (!confirmed) return;

    setWithdrawingReview(true);
    try {
      const updated = await updateChapterStatus(chapter.id, 'in_progress');
      setChapter(updated);
      const refreshedPages = await getChapterPages(chapter.id).catch(() => pages);
      setPages(refreshedPages);
      toast.success('Đã thu hồi xét duyệt — bạn có thể chỉnh sửa lại.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thu hồi được xét duyệt.');
    } finally {
      setWithdrawingReview(false);
    }
  };

  const openWorkspace = () => {
    const firstPage = pages[0];
    if (!firstPage) return;
    navigate(`/mangaka/pages/${firstPage.id}/workspace`);
  };

  const manuscriptUrl = isManuscriptUrl(chapter.description) ? chapter.description.trim() : null;
  const displayManuscriptName = manuscriptUrl
    ? resolveManuscriptFileName(manuscriptUrl, chapter.manuscriptFileName)
    : null;
  const hasDeadline = Boolean(chapter.deadline) && !Number.isNaN(new Date(chapter.deadline).getTime());

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative p-5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-5">
        {/* Header */}
        <Card padding="none" className="overflow-hidden border-border/80 shadow-sm">
          <div className="px-5 sm:px-6 py-5 bg-gradient-to-br from-foreground/[0.035] via-transparent to-primary/[0.04]">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate(paths.chaptersList)}
                  className="mt-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                      Ch.{chapter.number}
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight leading-tight">{chapter.title}</h1>
                    <Badge
                      status={displayChapterStatus}
                      statusKind="chapter"
                      size="md"
                      label={displayChapterStatusLabel}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{series?.title ?? '—'}</p>
                </div>
              </div>

              {!readOnly && (
                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    className="w-full sm:w-auto"
                    disabled={!canOpenWorkspace}
                    title={
                      !canProduce
                        ? (productionLockHint ?? 'Series không còn trong giai đoạn sản xuất.')
                        : !canEditChapter
                          ? (chapterLockHint ?? 'Chương đang bị khóa chỉnh sửa.')
                        : pages.length === 0
                          ? 'Thêm ít nhất một trang manga trước khi mở workspace.'
                          : 'Mở studio sản xuất — giao task cho trợ lý trên trang truyện.'
                    }
                    onClick={openWorkspace}
                  >
                    <Sparkles size={15} />
                    Mở Workspace
                  </Button>
                  {canSubmitForReview && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      loading={submittingReview}
                      onClick={() => void handleSubmitForReview()}
                    >
                      <Send size={15} />
                      Gửi xét duyệt
                    </Button>
                  )}
                  {canWithdrawReview && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      loading={withdrawingReview}
                      onClick={() => void handleWithdrawReview()}
                    >
                      <Undo2 size={15} />
                      Thu hồi để sửa
                    </Button>
                  )}
                  {(chapter.status === 'Approved' || chapter.status === 'Published') && (
                    <Button variant="outline" className="w-full sm:w-auto" disabled>
                      <CheckCircle2 size={15} />
                      Editor đã duyệt
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className={`mt-5 grid gap-2.5 ${totalTasks > 0 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
              {(chapter.status === 'Approved' || chapter.status === 'Published') ? (
                <StatTile
                  icon={CheckCircle2}
                  label="Hoàn thành"
                  value={
                    chapter.updatedAt && !Number.isNaN(new Date(chapter.updatedAt).getTime())
                      ? format(new Date(chapter.updatedAt), 'dd/MM/yyyy')
                      : 'Đã duyệt'
                  }
                />
              ) : (
                <StatTile
                  icon={Calendar}
                  label="Hạn nộp"
                  value={hasDeadline ? format(new Date(chapter.deadline), 'dd/MM/yyyy') : 'Chưa đặt'}
                />
              )}
              <StatTile icon={FileText} label="Trang" value={`${pages.length} trang`} />
              {totalTasks > 0 && (
                <>
                  <StatTile
                    icon={CheckCircle2}
                    label="Trang xong"
                    value={`${completedPages}/${pages.length}`}
                  />
                  <StatTile icon={Layers} label="Tiến độ task" value={`${progress}%`} />
                </>
              )}
            </div>

            {totalTasks > 0 && (
              <div className="mt-4">
                <ProgressBar value={progress} showLabel size="md" />
              </div>
            )}
          </div>
        </Card>

        {!canProduce && productionLockHint && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {productionLockHint}
          </div>
        )}
        {canProduce && chapterLockHint && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {chapterLockHint}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
          {/* Pages — main column */}
          <Card padding="none" className="xl:col-span-3 overflow-hidden border-border/80 shadow-sm">
            <div className="px-5 py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="mb-0">Trang manga</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {pages.length > 0
                    ? `${pages.length} trang — dùng ▲ ▼ trên thẻ để đổi thứ tự`
                    : 'Chưa có trang — tải lên để bắt đầu sản xuất'}
                </p>
              </div>
              {!readOnly && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddPageClick}
                    disabled={!canEdit || uploadingPages}
                    loading={uploadingPages}
                  >
                    <Plus size={14} />
                    {uploadingPages && uploadProgress
                      ? `Đang tải ${uploadProgress.done}/${uploadProgress.total}…`
                      : 'Thêm trang'}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </>
              )}
            </div>

            <div className="p-5">
              {canEdit && pages.length === 0 && (
                <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  <strong className="text-foreground font-semibold">Workspace</strong> là studio sản xuất:
                  tải trang, khoanh vùng, giao task trợ lý. Bấm{' '}
                  <strong className="text-foreground">Thêm trang</strong> và chọn nhiều ảnh cùng lúc (Ctrl/Shift)
                  để bắt đầu.
                </div>
              )}

              {pages.length === 0 ? (
                <EmptyState
                  icon={<Layers size={24} />}
                  title="Chưa có trang nào"
                  description={
                    readOnly
                      ? 'Mangaka chưa tải trang lên chương này.'
                      : 'Tải lên trang nháp để bắt đầu làm việc.'
                  }
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {displayPages.map((page, index) => (
                    <MangaPageCard
                      key={page.id}
                      page={page}
                      onDelete={readOnly || !canEdit ? undefined : handleDeletePage}
                      onMoveUp={readOnly || !canEdit ? undefined : id => handleMovePage(id, 'up')}
                      onMoveDown={readOnly || !canEdit ? undefined : id => handleMovePage(id, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < displayPages.length - 1}
                      reordering={reorderingPages}
                      readOnly={readOnly || !canEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Aside — manuscript */}
          <div className="xl:col-span-2 space-y-5 xl:sticky xl:top-4">
            <Card padding="none" className="overflow-hidden border-border/80 shadow-sm">
              <div className="px-5 py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="mb-0">Bản thảo chương</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">PDF / ZIP / CBZ — khác với trang nháp</p>
                </div>
                {!readOnly && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={uploadingManuscript}
                      onClick={() => manuscriptInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      {manuscriptUrl ? 'Thay file' : 'Tải lên'}
                    </Button>
                    <input
                      ref={manuscriptInputRef}
                      type="file"
                      accept=".pdf,.zip,.cbz,application/pdf,application/zip"
                      className="hidden"
                      onChange={handleManuscriptChange}
                    />
                  </>
                )}
              </div>
              <div className="p-5">
                {manuscriptUrl ? (
                  <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50/50 p-4 space-y-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold break-all leading-snug">
                          {displayManuscriptName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">File bản thảo đầy đủ của chương</p>
                      </div>
                    </div>
                    <a
                      href={buildManuscriptDownloadUrl(manuscriptUrl, displayManuscriptName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      <FileDown size={15} />
                      Tải bản thảo
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {readOnly
                        ? 'Chưa có file bản thảo chương.'
                        : 'Chưa có bản thảo — tải lên để lưu file gốc chương.'}
                    </p>
                    {!readOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={uploadingManuscript}
                        onClick={() => manuscriptInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        Tải lên
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <div className="rounded-xl border border-border/70 bg-card px-4 py-3.5 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground text-sm">Gợi ý</p>
              <p>• <span className="text-foreground/80">Bản thảo</span> = file gốc (PDF/ZIP).</p>
              <p>• <span className="text-foreground/80">Trang manga</span> = ảnh từng trang; chọn nhiều ảnh một lần, dùng ▲ ▼ để sửa thứ tự.</p>
              {canEdit && (
                <>
                  <p>• Bấm thẻ trang hoặc <span className="text-foreground/80">Mở Workspace</span> để sản xuất.</p>
                  <p>• Làm xong thì bấm <span className="text-foreground/80">Gửi xét duyệt</span> — Editor mới thấy chương. Board chỉ thấy sau khi Editor duyệt.</p>
                </>
              )}
              {!readOnly && !canEdit && chapterLockHint && (
                <p>• {chapterLockHint}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
