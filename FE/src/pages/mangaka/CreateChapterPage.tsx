import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import { MultiUploadBox } from '../../components/ui/UploadBox';
import { usePageMeta } from '../../hooks/usePageMeta';
import { createChapter, getSeries, getSeriesChapters } from '../../services/seriesApi';
import { uploadChapterPage } from '../../services/workspaceApi';

export default function CreateChapterPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [seriesTitle, setSeriesTitle] = useState('');
  const [isWeekly, setIsWeekly] = useState(false);
  const [form, setForm] = useState({
    number: '1',
    title: '',
    description: '',
    deadline: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({
      title: 'Tạo Chương',
      breadcrumb: [
        { label: 'Series của tôi', href: '/mangaka/series' },
        { label: seriesTitle || 'Series', href: `/mangaka/series/${seriesId}` },
        { label: 'Tạo Chương' },
      ],
    });
  }, [seriesTitle]);

  useEffect(() => {
    if (!seriesId) return;
    let isActive = true;
    Promise.all([getSeries(seriesId), getSeriesChapters(seriesId)])
      .then(([series, chapters]) => {
        if (!isActive) return;
        setSeriesTitle(series.title);
        const weekly = series.publishingType === 'Weekly';
        setIsWeekly(weekly);
        const next = Math.max(0, ...chapters.map(c => c.number)) + 1;
        const latestDeadline = chapters.map(chapter => chapter.deadline).filter(Boolean).sort().at(-1);
        const base = latestDeadline ? new Date(`${latestDeadline}T00:00:00`) : new Date();
        base.setDate(base.getDate() + 7);
        setForm(f => ({
          ...f,
          number: String(next),
          deadline: weekly ? base.toISOString().slice(0, 10) : f.deadline,
        }));
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [seriesId]);

  const update = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!seriesId) return;
    setError(null);
    setLoading(true);
    try {
      const created = await createChapter({
        seriesId,
        chapterNumber: Number(form.number) || 1,
        title: form.title || undefined,
        deadline: form.deadline || undefined,
      });

      // Upload selected draft pages sequentially
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          await uploadChapterPage(created.id, {
            file: selectedFiles[i],
            pageNumber: i + 1,
          });
        }
      }

      navigate(`/mangaka/series/${seriesId}/chapters`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo chương thất bại.');
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-colors';

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/mangaka/series/${seriesId}/chapters`)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Tạo Chương Mới</h1>
          <p className="text-sm text-muted-foreground">{seriesTitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Chi tiết Chương</CardTitle></CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Số chương</label>
                <input type="number" value={form.number} onChange={update('number')} required className={inputClass} min="1" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Tiêu đề Chương *</label>
                <input type="text" value={form.title} onChange={update('title')} required placeholder="Nhập tiêu đề chương…" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Mô tả</label>
              <textarea value={form.description} onChange={update('description')} rows={4}
                placeholder="Tóm tắt ngắn về nội dung chương này…"
                className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Hạn nộp *</label>
              <input type="date" value={form.deadline} onChange={update('deadline')} required disabled={isWeekly}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} />
              {isWeekly && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Series weekly: hệ thống tự đặt hạn chương kế tiếp cách hạn gần nhất 7 ngày.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tải lên trang nháp</CardTitle></CardHeader>
          <MultiUploadBox label="Tải lên trang Manga" onChange={setSelectedFiles} />
          <p className="text-xs text-muted-foreground mt-3">Tải lên trang nháp của bạn. Trợ lý sẽ làm việc từ các file này.</p>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(`/mangaka/series/${seriesId}/chapters`)}>Hủy</Button>
          <Button type="submit" variant="primary" loading={loading}>Tạo Chương</Button>
        </div>
      </form>
    </div>
  );
}
