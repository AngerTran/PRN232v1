import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Badge } from '../../app/components/ui/badge';
import type { Series, SeriesStatus } from '../../types/domain';
import { getApprovedSeries, getSeriesSchedules } from '../../services/seriesApi';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import { Search, CalendarDays, CalendarPlus } from 'lucide-react';

type ApprovedRow = Series & {
  scheduleType: 'Weekly' | 'Monthly' | null;
  hasSchedule: boolean;
};

function statusLabel(status: SeriesStatus): { text: string; className: string } {
  switch (status) {
    case 'In Progress':
      return { text: 'Đang xuất bản', className: 'text-blue-700 bg-blue-100' };
    case 'Published':
      return { text: 'Hoàn thành', className: 'text-slate-700 bg-slate-100' };
    case 'Approved':
    default:
      return { text: 'Đã duyệt', className: 'text-green-700 bg-green-100' };
  }
}

export default function BoardApprovedSeriesPage() {
  usePageMeta({ title: 'Series Đã Duyệt' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ApprovedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const list = await getApprovedSeries();
        const enriched = await Promise.all(
          list.map(async series => {
            const schedules = await getSeriesSchedules(series.id).catch(() => []);
            const latest = schedules.sort(
              (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
            )[0];
            const scheduleType = latest
              ? latest.frequency?.toLowerCase() === 'monthly'
                ? 'Monthly'
                : 'Weekly'
              : null;
            return { ...series, scheduleType, hasSchedule: schedules.length > 0 };
          })
        );
        if (isActive) setRows(enriched);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách series đã duyệt.');
          setRows([]);
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

  const filtered = rows.filter(
    s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.mangakaName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Series Đã Được Phê Duyệt</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? 'Đang tải...' : `${rows.length} series đã được hội đồng thông qua`}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên series hoặc mangaka..."
          className="pl-9 max-w-md"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mangaka</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thể Loại</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày Duyệt</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại XB</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng Thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Không có series nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map(series => {
                  const badge = statusLabel(series.status);
                  const publishType = series.scheduleType ?? series.publishingType;
                  return (
                    <tr key={series.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={series.coverUrl}
                            alt={series.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                          <span className="font-medium">{series.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{series.mangakaName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{series.genre}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {series.updatedAt ?? series.createdAt}
                      </td>
                      <td className="px-4 py-3">
                        {publishType ? (
                          <PublishingTypeBadge type={publishType} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa lên lịch</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/board/publishing-schedule?seriesId=${series.id}`)}
                        >
                          {series.hasSchedule ? (
                            <CalendarDays className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                          )}
                          {series.hasSchedule ? 'Xem lịch' : 'Lên lịch'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Hiển thị {filtered.length} / {rows.length} series
        </p>
      )}
    </div>
  );
}
