import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LayoutGrid, List, Plus, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import SearchInput from '../../components/ui/SearchInput';
import FilterDropdown from '../../components/ui/FilterDropdown';
import SeriesCard from '../../components/ui/SeriesCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { Series } from '../../types/domain';
import { deleteSeries, getMySeries, canMangakaDeleteSeries } from '../../services/seriesApi';
import { SERIES_STATUS_FILTER_OPTIONS, formatSeriesStatusLabel } from '../../utils/statusLabels';

const STATUS_OPTIONS = SERIES_STATUS_FILTER_OPTIONS;
const GENRE_OPTIONS = ['Action', 'Historical', 'Sci-fi', 'Fantasy', 'Drama', 'Supernatural'];
const SERIES_GRID_CLASS = 'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

export default function SeriesListPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [genreFilter, setGenreFilter] = useState('All');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPageMeta({ title: 'Series của tôi' });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMySeries()
      .then(items => {
        if (active) setSeries(items);
      })
      .catch(() => {
        if (active) setError('Không thể tải series từ backend.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDeleteSeries = async (seriesId: string) => {
    const target = series.find(s => s.id === seriesId);
    if (!target) return;

    if (!canMangakaDeleteSeries(target.status)) {
      setError(
        'Chỉ có thể xóa series ở trạng thái bản nháp. Series đã gửi xét duyệt hoặc đang xuất bản không thể xóa.',
      );
      return;
    }

    const confirmed = await confirm({
      title: 'Xóa series',
      variant: 'danger',
      message: (
        <>
          Bạn có chắc muốn xóa series{' '}
          <span className="font-semibold text-foreground">{target?.title ?? ''}</span>?
          <br />
          Toàn bộ chương và dữ liệu liên quan sẽ bị xóa. Hành động này không thể hoàn tác.
        </>
      ),
      confirmText: 'Xóa series',
    });
    if (!confirmed) return;

    const previous = series;
    setSeries(prev => prev.filter(s => s.id !== seriesId));
    try {
      await deleteSeries(seriesId);
    } catch (err) {
      setSeries(previous);
      setError(err instanceof Error ? err.message : 'Không thể xóa series.');
    }
  };

  const filtered = series.filter(s => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase())
      || s.genre.toLowerCase().includes(search.toLowerCase())
      || (s.synopsis ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchGenre = genreFilter === 'All' || s.genres.includes(genreFilter);
    return matchSearch && matchStatus && matchGenre;
  });

  return (
    <div className="w-full min-w-0 p-5 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Series của tôi</h1>
          <p className="text-sm text-muted-foreground mt-1">{series.length} series</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/mangaka/series/create')}>
          <Plus size={16} /> Series mới
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm series, thể loại…"
          className="flex-1 min-w-[200px] max-w-md"
        />
        <FilterDropdown
          label="Trạng thái"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          formatOptionLabel={formatSeriesStatusLabel}
        />
        <FilterDropdown label="Thể loại" options={GENRE_OPTIONS} value={genreFilter} onChange={setGenreFilter} />
        <div className="ml-auto flex items-center gap-1 bg-muted p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={clsx(
              'p-1.5 rounded-lg transition-all',
              view === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={clsx(
              'p-1.5 rounded-lg transition-all',
              view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className={SERIES_GRID_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-muted/30 aspect-[3/5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Không tìm thấy series"
          description={
            search || statusFilter !== 'All'
              ? 'Thử điều chỉnh tìm kiếm hoặc bộ lọc.'
              : 'Bạn chưa tạo series nào.'
          }
          action={
            <Button variant="primary" onClick={() => navigate('/mangaka/series/create')}>
              Tạo Series Đầu Tiên
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <div className={SERIES_GRID_CLASS}>
          {filtered.map(s => (
            <SeriesCard key={s.id} series={s} view="grid" onDelete={handleDeleteSeries} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <SeriesCard key={s.id} series={s} view="list" onDelete={handleDeleteSeries} />
          ))}
        </div>
      )}
    </div>
  );
}
