import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Input } from '../../app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../app/components/ui/select';
import { SeriesSummaryCard } from '../../app/components/ui/editor';
import type { Series } from '../../types/domain';
import { getEditorAssignedSeries } from '../../services/editorApi';
import { SERIES_STATUS_FILTER_OPTIONS, formatSeriesStatusLabel } from '../../utils/statusLabels';
import { Search } from 'lucide-react';

const EDITOR_SERIES_STATUS_OPTIONS = SERIES_STATUS_FILTER_OPTIONS.filter(
  status => status !== 'Submitted' && status !== 'Revision Required',
);

export default function AssignedSeriesPage() {
  usePageMeta({ title: 'Series Phụ Trách' });
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSeries() {
      setIsLoading(true);
      setError(null);

      try {
        const series = await getEditorAssignedSeries();
        if (isActive) {
          setAllSeries(series);
        }
      } catch (err) {
        if (isActive) {
          setAllSeries([]);
          setError(err instanceof Error ? err.message : 'Không thể tải series từ backend.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSeries();

    return () => {
      isActive = false;
    };
  }, []);

  // Filter
  const filteredSeries = allSeries.filter(series => {
    const matchesSearch = series.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || series.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Series Phụ Trách</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý {allSeries.length} series bạn đang theo dõi
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên series..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {EDITOR_SERIES_STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>
                {formatSeriesStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Series Grid */}
      {isLoading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            Đang tải series...
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="py-12 text-center text-destructive">
            {error}
          </div>
        </Card>
      ) : filteredSeries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSeries.map(series => (
            <SeriesSummaryCard
              key={series.id}
              series={series}
              onClick={() => navigate(`/editor/series/${series.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            Không tìm thấy series nào
          </div>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        Hiển thị {filteredSeries.length} / {allSeries.length} series
      </div>
    </div>
  );
}
