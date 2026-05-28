import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Badge } from '../../app/components/ui/badge';
import { getBoardSubmissions, type BoardSubmissionStatus } from '../../data/mockData';
import { SubmissionStatusBadge } from '../../app/components/ui/board';
import { Search, Eye } from 'lucide-react';

export default function BoardSubmissionsPage() {
  usePageMeta({ title: 'Duyệt Series' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const all = getBoardSubmissions();
  const filtered = all.filter((s) => {
    const matchSearch =
      s.seriesTitle.toLowerCase().includes(search.toLowerCase()) ||
      s.mangakaName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Danh Sách Duyệt Series</h1>
        <p className="text-muted-foreground mt-1">
          Hội đồng xem xét và biểu quyết {all.length} series đã nộp
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
            onChange={(e) => setSearch(e.target.value)}
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
            <SelectItem value="More Info Required">Cần Thêm Thông Tin</SelectItem>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thể Loại</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày Nộp</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng Thái</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kết Quả Vote</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Không tìm thấy series nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={sub.coverUrl} alt={sub.seriesTitle} className="w-10 h-14 object-cover rounded" />
                        <span className="font-medium">{sub.seriesTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.mangakaName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{sub.genre}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{sub.submittedDate}</td>
                    <td className="px-4 py-3">
                      <SubmissionStatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 font-semibold">✓{sub.voteResult.approve}</span>
                        <span className="text-red-600 font-semibold">✗{sub.voteResult.reject}</span>
                        <span className="text-amber-600 font-semibold">?{sub.voteResult.moreInfo}</span>
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
        Hiển thị {filtered.length} / {all.length} submissions
      </p>
    </div>
  );
}
