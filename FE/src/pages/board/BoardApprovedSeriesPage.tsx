import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Badge } from '../../app/components/ui/badge';
import { getBoardSubmissions, getPublishingSchedules } from '../../data/mockData';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import { Search, Settings } from 'lucide-react';

export default function BoardApprovedSeriesPage() {
  usePageMeta({ title: 'Series Đã Duyệt' });
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const approved = getBoardSubmissions().filter((s) => s.status === 'Approved');
  const schedules = getPublishingSchedules();

  const filtered = approved.filter(
    (s) =>
      s.seriesTitle.toLowerCase().includes(search.toLowerCase()) ||
      s.mangakaName.toLowerCase().includes(search.toLowerCase())
  );

  const getSchedule = (seriesTitle: string) =>
    schedules.find((s) => s.seriesTitle === seriesTitle);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Series Đã Được Phê Duyệt</h1>
        <p className="text-muted-foreground mt-1">
          {approved.length} series đã được hội đồng thông qua
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên series hoặc mangaka..."
          className="pl-9 max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Không có series nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const sched = getSchedule(sub.seriesTitle);
                  return (
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
                        {sched ? (
                          <PublishingTypeBadge type={sched.publishingType} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa lên lịch</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Đã Duyệt
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => navigate('/board/publishing-schedule')}>
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Quản Lý
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

      <p className="text-xs text-muted-foreground">Hiển thị {filtered.length} / {approved.length} series</p>
    </div>
  );
}
