import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import SearchInput from '../../components/ui/SearchInput';
import FilterDropdown from '../../components/ui/FilterDropdown';
import SeriesCard from '../../components/ui/SeriesCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { series, type SeriesStatus } from '../../data/mockData';
import { BookOpen } from 'lucide-react';

const STATUS_OPTIONS: SeriesStatus[] = ['Draft', 'Submitted', 'Approved', 'In Progress', 'Revision Required', 'At Risk', 'Published', 'Cancelled'];
const GENRE_OPTIONS = ['Action', 'Historical', 'Sci-fi', 'Fantasy', 'Drama', 'Supernatural'];

export default function SeriesListPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [genreFilter, setGenreFilter] = useState('All');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => { setPageMeta({ title: 'Series của tôi' }); }, []);

  const filtered = series.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.genre.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchGenre = genreFilter === 'All' || s.genres.includes(genreFilter);
    return matchSearch && matchStatus && matchGenre;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Series của tôi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{series.length} series</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/mangaka/series/create')}>
          <Plus size={16} /> Series mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm series…" className="flex-1 min-w-[200px] max-w-xs" />
        <FilterDropdown label="Trạng thái" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
        <FilterDropdown label="Thể loại" options={GENRE_OPTIONS} value={genreFilter} onChange={setGenreFilter} />
        <div className="ml-auto flex items-center gap-1 bg-muted p-1 rounded-xl">
          <button onClick={() => setView('grid')} className={clsx('p-1.5 rounded-lg transition-all', view === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setView('list')} className={clsx('p-1.5 rounded-lg transition-all', view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <List size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Không tìm thấy series"
          description={search || statusFilter !== 'All' ? 'Thử điều chỉnh tìm kiếm hoặc bộ lọc.' : 'Bạn chưa tạo series nào.'}
          action={<Button variant="primary" onClick={() => navigate('/mangaka/series/create')}>Tạo Series Đầu Tiên</Button>}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(s => <SeriesCard key={s.id} series={s} view="grid" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => <SeriesCard key={s.id} series={s} view="list" />)}
        </div>
      )}
    </div>
  );
}
