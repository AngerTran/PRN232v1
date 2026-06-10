import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import ChapterCard from '../../components/ui/ChapterCard';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { Chapter, Series } from '../../types/domain';
import { getSeries, getSeriesChapters, deleteChapter } from '../../services/seriesApi';
import { FileText } from 'lucide-react';

export default function ChapterListPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();

  const [series, setSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!seriesId) return;

    let active = true;

    async function loadChapters() {
      setLoading(true);
      setError('');

      try {
        const [seriesItem, chapterItems] = await Promise.all([
          getSeries(seriesId),
          getSeriesChapters(seriesId),
        ]);

        if (!active) return;
        setSeries(seriesItem);
        setChapters(chapterItems.sort((a, b) => a.number - b.number));
      } catch (err) {
        if (active) {
          setSeries(null);
          setChapters([]);
          setError(err instanceof Error ? err.message : 'Không thể tải chương từ backend.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadChapters();

    return () => {
      active = false;
    };
  }, [seriesId]);

  useEffect(() => {
    setPageMeta({
      title: 'Chương',
      breadcrumb: [
        { label: 'Series của tôi', href: '/mangaka/series' },
        { label: series?.title ?? 'Series', href: `/mangaka/series/${seriesId}` },
        { label: 'Chương' },
      ],
    });
  }, [series?.id, seriesId]);

  const handleDeleteChapter = async (chapterId: string) => {
    const target = chapters.find(c => c.id === chapterId);
    const confirmed = await confirm({
      title: 'Xóa chương',
      message: (
        <>
          Bạn có chắc muốn xóa chương <span className="font-semibold text-foreground">Ch.{target?.number} {target?.title ?? ''}</span>?
          <br />Hành động này không thể hoàn tác.
        </>
      ),
      confirmText: 'Xóa chương',
    });
    if (!confirmed) return;

    const previous = chapters;
    setChapters(prev => prev.filter(c => c.id !== chapterId));
    try {
      await deleteChapter(chapterId);
    } catch (err) {
      setChapters(previous);
      alert(err instanceof Error ? err.message : 'Không thể xóa chương.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải chương...</div>;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/mangaka/series/${seriesId}`)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{series?.title ?? 'Chapters'}</h1>
            <p className="text-sm text-muted-foreground">{chapters.length} chương</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => navigate(`/mangaka/series/${seriesId}/chapters/create`)}>
          <Plus size={16} /> Chương mới
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {chapters.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="Chưa có chương nào"
          description="Tạo chương đầu tiên cho series này."
          action={
            <Button variant="primary" onClick={() => navigate(`/mangaka/series/${seriesId}/chapters/create`)}>
              Tạo Chương Đầu Tiên
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {chapters.map(ch => (
            <ChapterCard key={ch.id} chapter={ch} seriesId={seriesId ?? ''} onDelete={handleDeleteChapter} />
          ))}
        </div>
      )}
    </div>
  );
}
