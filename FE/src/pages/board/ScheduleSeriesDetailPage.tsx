import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, CalendarDays, Plus, Pencil, Trash2, X } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import type { Series } from '../../types/domain';
import {
  getSeries,
  getSeriesSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  canSchedulePublishing,
  type PublishingScheduleItem,
} from '../../services/seriesApi';
import { getBoardVoteProgress, type BoardVoteProgress } from '../../services/boardApi';

const emptyForm = { frequency: 'weekly', publishDate: '', issueNumber: '', notes: '' };

export default function ScheduleSeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [series, setSeries] = useState<Series | null>(null);
  const [schedules, setSchedules] = useState<PublishingScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [boardProgress, setBoardProgress] = useState<BoardVoteProgress | null>(null);

  async function load() {
    if (!seriesId) return;
    setLoading(true);
    setError('');
    try {
      const [s, sc, progress] = await Promise.all([
        getSeries(seriesId),
        getSeriesSchedules(seriesId),
        getBoardVoteProgress(seriesId).catch(() => null),
      ]);
      setSeries(s);
      setSchedules(sc);
      setBoardProgress(progress);
      setPageMeta({
        title: `Lịch · ${s.title}`,
        breadcrumb: [
          { label: 'Lịch Xuất Bản', href: '/board/publishing-schedule' },
          { label: s.title },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [seriesId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      frequency: series?.publishingType === 'Monthly' ? 'monthly' : 'weekly',
    });
    setShowForm(true);
  };

  const openEdit = (row: PublishingScheduleItem) => {
    setEditingId(row.id);
    setForm({
      frequency: row.frequency?.toLowerCase() === 'monthly' ? 'monthly' : 'weekly',
      publishDate: row.publishDate,
      issueNumber: row.issueNumber != null ? String(row.issueNumber) : '',
      notes: row.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId || !form.publishDate) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        publishDate: form.publishDate,
        frequency: form.frequency,
        issueNumber: form.issueNumber ? Number(form.issueNumber) : undefined,
        notes: form.notes || undefined,
      };
      if (editingId) await updateSchedule(editingId, payload);
      else await createSchedule(seriesId, payload);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      const sc = await getSeriesSchedules(seriesId);
      setSchedules(sc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu lịch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      if (editingId === id) {
        setShowForm(false);
        setEditingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa lịch.');
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  if (!series) return <div className="p-6 text-muted-foreground">{error || 'Không tìm thấy series.'}</div>;

  const canScheduleStatus = canSchedulePublishing(series.status);
  const canManageSchedule = canScheduleStatus && (boardProgress?.canManagePublishingSchedule ?? true);
  const canSchedule = canManageSchedule;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="flex-1 min-w-0 lg:overflow-y-auto p-6 space-y-5">
        <button
          type="button"
          onClick={() => navigate('/board/publishing-schedule')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} /> Quay lại
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{series.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{schedules.length} lịch phát hành</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/board/approved-series/${series.id}/read`)}
            >
              Xem trang truyện
            </Button>
            {canSchedule && (
              <Button onClick={() => (showForm ? setShowForm(false) : openCreate())}>
                {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {showForm ? 'Đóng' : 'Thêm kỳ'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!canScheduleStatus && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Series chưa được editor đánh dấu hoàn thành — chỉ xem lịch, không tạo mới.
          </div>
        )}
        {canScheduleStatus && !canManageSchedule && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Chỉ board phụ trách chính ({boardProgress?.leadBoardMemberName ?? '—'}) được sắp lịch xuất bản. Bạn có thể xem lịch.
          </div>
        )}

        {showForm && canSchedule && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Sửa lịch' : 'Tạo lịch mới'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Loại xuất bản</label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ngày phát hành</label>
                <Input type="date" value={form.publishDate} onChange={e => setForm({ ...form, publishDate: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kỳ (issue)</label>
                <Input type="number" min={1} value={form.issueNumber} onChange={e => setForm({ ...form, issueNumber: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Ghi chú</label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="resize-none" />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : editingId ? 'Lưu' : 'Tạo lịch'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={16} />
              Danh sách lịch
            </CardTitle>
          </CardHeader>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lịch nào.</p>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium">Kỳ {s.issueNumber ?? '—'}</span>
                      <PublishingTypeBadge type={s.frequency?.toLowerCase() === 'monthly' ? 'Monthly' : 'Weekly'} />
                    </div>
                    <p className="text-sm text-muted-foreground">{s.publishDate}</p>
                    {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                  </div>
                  {canSchedule && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <aside className="shrink-0 w-full lg:w-[min(360px,34vw)] border-t lg:border-t-0 lg:border-l border-border p-6 bg-background">
        <div className="rounded-2xl border border-border overflow-hidden aspect-[280/380] max-h-[420px] mb-4">
          <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
        </div>
        <p className="text-sm text-muted-foreground">{series.mangakaName}</p>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{series.synopsis}</p>
      </aside>
    </div>
  );
}
