import { useEffect, useState } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import type { Series } from '../../data/mockData';
import {
  getVisibleSeries,
  getSeriesSchedules,
  createSchedule,
  deleteSchedule,
  type PublishingScheduleItem,
} from '../../services/seriesApi';
import { Plus, X, CalendarDays, Trash2 } from 'lucide-react';

type ScheduleRow = PublishingScheduleItem & { seriesTitle: string; mangakaName?: string };

const emptyForm = { seriesId: '', frequency: 'weekly', publishDate: '', issueNumber: '', notes: '' };

export default function PublishingSchedulePage() {
  usePageMeta({ title: 'Lịch Xuất Bản' });

  const [series, setSeries] = useState<Series[]>([]);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const list = await getVisibleSeries();
      const groups = await Promise.all(
        list.map(async s => {
          const schedules = await getSeriesSchedules(s.id).catch(() => []);
          return schedules.map<ScheduleRow>(sc => ({ ...sc, seriesTitle: s.title, mangakaName: s.mangakaName }));
        })
      );
      setSeries(list);
      setRows(groups.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch xuất bản.');
      setSeries([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.seriesId || !form.publishDate) return;
    setSaving(true);
    setError('');
    try {
      await createSchedule(form.seriesId, {
        publishDate: form.publishDate,
        frequency: form.frequency,
        issueNumber: form.issueNumber ? Number(form.issueNumber) : undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm(emptyForm);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo lịch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa lịch.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lịch Xuất Bản</h1>
          <p className="text-muted-foreground mt-1">{rows.length} lịch phát hành</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Đóng' : 'Tạo Lịch'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Create Form */}
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
                <Select value={form.seriesId} onValueChange={v => setForm({ ...form, seriesId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn series..." />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Loại Xuất Bản</label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hàng Tuần (Weekly)</SelectItem>
                    <SelectItem value="monthly">Hàng Tháng (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ngày Phát Hành</label>
                <Input
                  type="date"
                  value={form.publishDate}
                  onChange={e => setForm({ ...form, publishDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kỳ (Issue)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="VD: 1"
                  value={form.issueNumber}
                  onChange={e => setForm({ ...form, issueNumber: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Ghi Chú</label>
                <Textarea
                  placeholder="Ghi chú thêm (tùy chọn)..."
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="resize-none"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={!form.seriesId || !form.publishDate || saving}>
                  {saving ? 'Đang tạo…' : 'Tạo Lịch'}
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kỳ</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ghi Chú</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Chưa có lịch xuất bản nào</td></tr>
              ) : (
                rows.map(s => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.seriesTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.mangakaName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <PublishingTypeBadge type={s.frequency?.toLowerCase() === 'monthly' ? 'Monthly' : 'Weekly'} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.publishDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.issueNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{s.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
