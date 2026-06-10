import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Calendar, FileText, Layers, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import MangaPageCard from '../../components/ui/MangaPageCard';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { Chapter, Series } from '../../types/domain';
import { getChapter, getSeries } from '../../services/seriesApi';
import { getChapterPages, uploadChapterPage, deleteChapterPage, type WorkspacePageItem } from '../../services/workspaceApi';
import { format } from 'date-fns';

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
          { label: 'Series của tôi', href: '/mangaka/series' },
          { label: series?.title ?? 'Series', href: `/mangaka/series/${chapter.seriesId}` },
          { label: `Ch.${chapter.number}` },
        ],
      });
    }
  }, [chapter?.id]);

  const handleAddPageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chapterId) return;

    try {
      setIsLoading(true);
      const nextPageNumber = pages.length > 0 ? Math.max(...pages.map(p => p.pageNumber)) + 1 : 1;
      const newPage = await uploadChapterPage(chapterId, {
        file,
        pageNumber: nextPageNumber,
      });
      setPages(prev => [...prev, newPage].sort((a, b) => a.pageNumber - b.pageNumber));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tải trang lên.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePage = async (pageId: string) => {
    const target = pages.find(p => p.id === pageId);
    const confirmed = await confirm({
      title: 'Xóa trang',
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

  if (isLoading) {
    return <div className="p-6"><EmptyState title="Đang tải chương..." /></div>;
  }

  if (!chapter) {
    if (error) {
      return <div className="p-6"><EmptyState title="Không tải được chương" description={error} /></div>;
    }
    return <div className="p-6"><EmptyState title="Không tìm thấy chương" /></div>;
  }

  // Tiến độ tính theo task đã duyệt (approved). Một trang coi là hoàn thành khi có task và tất cả đã duyệt.
  const totalTasks = pages.reduce((sum, p) => sum + (p.tasksCount ?? 0), 0);
  const completedTasks = pages.reduce((sum, p) => sum + (p.completedTasksCount ?? 0), 0);
  const completedPages = pages.filter(p => (p.tasksCount ?? 0) > 0 && (p.completedTasksCount ?? 0) === p.tasksCount).length;
  const progress = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : (chapter.status === 'Published' ? 100 : 0);

  const displayChapterStatus =
    (chapter.status === 'Draft' || chapter.status === 'In Progress') && totalTasks > 0 && progress === 100
      ? 'Approved'
      : (chapter.status === 'Draft' || chapter.status === 'In Progress') && totalTasks > 0 && progress > 0
      ? 'In Progress'
      : chapter.status;

  // Suy ra trạng thái hiển thị của trang theo task: đủ task đã duyệt → Hoàn thành.
  const displayPages = pages.map(p => {
    const total = p.tasksCount ?? 0;
    const done = p.completedTasksCount ?? 0;
    if (total > 0 && done === total) return { ...p, status: 'Completed' as const };
    if (total > 0 && done > 0) return { ...p, status: 'In Progress' as const };
    return p;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/mangaka/series/${chapter.seriesId}/chapters`)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-0.5">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-muted-foreground">Ch.{chapter.number}</span>
            <h1 className="text-xl font-bold">{chapter.title}</h1>
            <Badge status={displayChapterStatus} size="md" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">{series?.title}</p>

          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>Hạn nộp {format(new Date(chapter.deadline), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText size={14} />
              <span>{pages.length} trang</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Layers size={14} />
              <span>{completedPages}/{pages.length} hoàn thành</span>
            </div>
          </div>

          <div className="mt-3 max-w-sm">
            <ProgressBar value={progress} showLabel size="md" />
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => pages[0] && navigate(`/mangaka/pages/${pages[0].id}/workspace`)}>
          Mở Workspace
        </Button>
      </div>

      {/* Page grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Trang Manga</h2>
          <Button variant="outline" size="sm" onClick={handleAddPageClick}>
            <Plus size={14} /> Thêm trang
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={<Layers size={24} />}
            title="Chưa có trang nào"
            description="Tải lên trang nháp để bắt đầu làm việc."
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {displayPages.map(page => (
              <MangaPageCard key={page.id} page={page} onDelete={handleDeletePage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
