import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import FilterDropdown from '../../components/ui/FilterDropdown';
import ChapterCard from '../../components/ui/ChapterCard';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Chapter, Series } from '../../types/domain';
import { getMySeries, getSeriesChapters } from '../../services/seriesApi';
import { CHAPTER_STATUS_FILTER_OPTIONS, formatChapterStatusLabel } from '../../utils/statusLabels';

const STATUS_OPTIONS = CHAPTER_STATUS_FILTER_OPTIONS;

export default function ChaptersOverviewPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [statusFilter, setStatusFilter] = useState('All');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPageMeta({ title: 'Chương' }); }, []);

  useEffect(() => {
    let isActive = true;
    getMySeries()
      .then(async list => {
        const chapterLists = await Promise.all(
          list.map(s => getSeriesChapters(s.id).catch(() => [] as Chapter[]))
        );
        if (!isActive) return;
        setSeriesList(list);
        setAllChapters(chapterLists.flat());
      })
      .catch(() => {
        if (isActive) {
          setSeriesList([]);
          setAllChapters([]);
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const filtered = allChapters.filter(c =>
    statusFilter === 'All' || c.status === statusFilter
  ).sort((a, b) => {
    // Sort by series name then chapter number
    const sa = seriesList.find(s => s.id === a.seriesId)?.title ?? '';
    const sb = seriesList.find(s => s.id === b.seriesId)?.title ?? '';
    if (sa !== sb) return sa.localeCompare(sb);
    return a.number - b.number;
  });

  const groupedBySeries = filtered.reduce<Record<string, Chapter[]>>((acc, ch) => {
    if (!acc[ch.seriesId]) acc[ch.seriesId] = [];
    acc[ch.seriesId].push(ch);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Tất cả chương</h1>
          <p className="text-sm text-muted-foreground">{allChapters.length} chương trong {seriesList.length} series</p>
        </div>
        <FilterDropdown label="Trạng thái" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} formatOptionLabel={formatChapterStatusLabel} />
      </div>

      {loading ? (
        <EmptyState icon={<FileText size={24} />} title="Đang tải chương…" />
      ) : Object.entries(groupedBySeries).length === 0 ? (
        <EmptyState icon={<FileText size={24} />} title="Không tìm thấy chương" />
      ) : (
        Object.entries(groupedBySeries).map(([seriesId, seriesChapters]) => {
          const s = seriesList.find(s => s.id === seriesId);
          return (
            <div key={seriesId}>
              <div className="flex items-center gap-3 mb-3">
                {s?.coverUrl && (
                  <div className="w-7 h-9 rounded-md overflow-hidden shrink-0">
                    <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <button
                  onClick={() => navigate(`/mangaka/series/${seriesId}`)}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {s?.title ?? seriesId}
                </button>
                <span className="text-xs text-muted-foreground">({seriesChapters.length})</span>
              </div>
              <div className="space-y-2 mb-5">
                {seriesChapters.map(ch => (
                  <ChapterCard key={ch.id} chapter={ch} seriesId={seriesId} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
