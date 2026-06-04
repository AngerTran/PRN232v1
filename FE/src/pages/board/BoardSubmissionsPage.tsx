import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { SubmissionStatusBadge } from '../../app/components/ui/board';
import type { BoardSubmissionStatus } from '../../data/mockData';
import { getPendingSeries, type PendingSeriesItem } from '../../services/boardApi';
import { Search, Eye } from 'lucide-react';

function mapStatus(status: string): BoardSubmissionStatus {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'publishing':
    case 'completed':
      return 'Approved';
    case 'cancelled':
      return 'Rejected';
    case 'pending_review':
    default:
      return 'Pending Review';
  }
}

export default function BoardSubmissionsPage() {
  usePageMeta({ title: 'Duyệt Series' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [items, setItems] = useState<PendingSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    getPendingSeries()
      .then(list => {
        if (isActive) setItems(list);
      })
      .catch(err => {
        if (isActive) setError(err instanceof Error ? err.message : 'Không thể tải danh sách từ backend.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const filtered = items.filter(s => {
    const status = mapStatus(s.status);
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.authorName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Danh Sách Duyệt Series</h1>
        <p className="text-muted-foreground mt-1">
          Hội đồng xem xét và biểu quyết {items.length} series
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên series hoặc mangaka..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="Pending Review">Chờ Duyệt</SelectItem>
            <SelectItem value="Approved">Đã Duyệt</SelectItem>
            <SelectItem value="Rejected">Từ Chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mangaka</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng Thái</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kết Quả Vote</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Đang tải...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Không tìm thấy series nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{sub.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.authorName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <SubmissionStatusBadge status={mapStatus(sub.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 font-semibold">✓{sub.approveVotes}</span>
                        <span className="text-red-600 font-semibold">✗{sub.rejectVotes}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/board/submissions/${sub.id}`)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Chi Tiết
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Hiển thị {filtered.length} / {items.length} series
      </p>
    </div>
  );
}
