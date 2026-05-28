import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import ChapterCard from '../../components/ui/ChapterCard';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getSeriesById, getChaptersBySeriesId } from '../../data/mockData';
import { FileText } from 'lucide-react';

export default function ChapterListPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const series = getSeriesById(seriesId ?? '');
  const chapters = getChaptersBySeriesId(seriesId ?? '').sort((a, b) => a.number - b.number);

  useEffect(() => {
    setPageMeta({
      title: 'Chương',
      breadcrumb: [
        { label: 'Series của tôi', href: '/mangaka/series' },
        { label: series?.title ?? 'Series', href: `/mangaka/series/${seriesId}` },
        { label: 'Chương' },
      ],
    });
  }, [series?.id]);

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
            <ChapterCard key={ch.id} chapter={ch} seriesId={seriesId ?? ''} />
          ))}
        </div>
      )}
    </div>
  );
}
