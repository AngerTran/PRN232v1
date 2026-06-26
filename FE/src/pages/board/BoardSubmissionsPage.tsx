import { useEffect, useState } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Input } from '../../app/components/ui/input';
import { BoardSubmissionCard } from '../../app/components/ui/board/BoardSubmissionCard';
import { getPendingSeries, BOARD_VOTES_REQUIRED, type PendingSeriesItem } from '../../services/boardApi';
import { getSeries } from '../../services/seriesApi';
import type { Series } from '../../types/domain';
import { Search, Inbox } from 'lucide-react';

type EnrichedPending = PendingSeriesItem & { series: Series | null };

export default function BoardSubmissionsPage() {
  usePageMeta({ title: 'Duyệt Series' });
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<EnrichedPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const list = await getPendingSeries();
        const enriched = await Promise.all(
          list.map(async item => {
            const series = await getSeries(item.id).catch(() => null);
            return { ...item, series };
          })
        );
        if (isActive) setItems(enriched);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách từ backend.');
          setItems([]);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, []);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.authorName ?? '').toLowerCase().includes(q) ||
      (item.series?.genre ?? '').toLowerCase().includes(q) ||
      (item.series?.synopsis ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Duyệt Series</h1>
        <p className="text-muted-foreground mt-1">
          {loading
            ? 'Đang tải hồ sơ đề xuất...'
            : `${items.length} series chờ xét duyệt · cần ${BOARD_VOTES_REQUIRED} phiếu board để quyết định`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên, mangaka, thể loại..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/30 aspect-[3/5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Không có series chờ duyệt</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Thử từ khóa khác hoặc xóa bộ lọc.' : 'Mangaka chưa gửi đề xuất series mới.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => (
            <BoardSubmissionCard key={item.id} item={item} series={item.series} />
          ))}
        </div>
      )}

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Hiển thị {filtered.length} / {items.length} series · Nhấn thẻ để xem hồ sơ đầy đủ và bỏ phiếu
        </p>
      )}
    </div>
  );
}
