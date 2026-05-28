import { useState } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import { getPublishingSchedules, type PublishingSchedule } from '../../data/mockData';
import { ScheduleStatusBadge, PublishingTypeBadge } from '../../app/components/ui/board';
import { Plus, X, CalendarDays } from 'lucide-react';

export default function PublishingSchedulePage() {
  usePageMeta({ title: 'Lịch Xuất Bản' });
  const [schedules] = useState<PublishingSchedule[]>(getPublishingSchedules());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    series: '',
    publishingType: 'Weekly',
    startDate: '',
    releaseDay: '',
    note: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
    setForm({ series: '', publishingType: 'Weekly', startDate: '', releaseDay: '', note: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lịch Xuất Bản</h1>
          <p className="text-muted-foreground mt-1">Quản lý lịch phát hành của {schedules.length} series đang hoạt động</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Đóng' : 'Tạo Lịch'}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Tạo Lịch Xuất Bản Mới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Series</label>
                <Input
                  placeholder="Tên series..."
                  value={form.series}
                  onChange={(e) => setForm({ ...form, series: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Loại Xuất Bản</label>
                <Select value={form.publishingType} onValueChange={(v) => setForm({ ...form, publishingType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Hàng Tuần (Weekly)</SelectItem>
                    <SelectItem value="Monthly">Hàng Tháng (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ngày Bắt Đầu</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ngày Phát Hành</label>
                <Input
                  placeholder="VD: Thứ Hai, 15 hàng tháng..."
                  value={form.releaseDay}
                  onChange={(e) => setForm({ ...form, releaseDay: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Ghi Chú</label>
                <Textarea
                  placeholder="Ghi chú thêm (tùy chọn)..."
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="resize-none"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={!form.series || !form.startDate}>
                  Tạo Lịch
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Schedule Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mangaka</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại XB</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày Phát Hành</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bắt Đầu</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kỳ Tiếp Theo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng Thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.seriesTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.mangakaName}</td>
                  <td className="px-4 py-3">
                    <PublishingTypeBadge type={s.publishingType} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.releaseDay}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.startDate}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.nextReleaseDate}</td>
                  <td className="px-4 py-3">
                    <ScheduleStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" className="text-xs">
                      Sửa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {schedules.some(s => s.note) && (
          <div className="border-t px-4 py-3 space-y-2">
            {schedules.filter(s => s.note).map(s => (
              <p key={s.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{s.seriesTitle}:</span> {s.note}
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
