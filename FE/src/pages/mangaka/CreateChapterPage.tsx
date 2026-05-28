import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import { MultiUploadBox } from '../../components/ui/UploadBox';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getSeriesById, getChaptersBySeriesId } from '../../data/mockData';

export default function CreateChapterPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const series = getSeriesById(seriesId ?? '');
  const existingChapters = getChaptersBySeriesId(seriesId ?? '');
  const nextNumber = Math.max(0, ...existingChapters.map(c => c.number)) + 1;

  const [form, setForm] = useState({
    number: String(nextNumber),
    title: '',
    description: '',
    deadline: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: 'Tạo Chương',
      breadcrumb: [
        { label: 'Series của tôi', href: '/mangaka/series' },
        { label: series?.title ?? 'Series', href: `/mangaka/series/${seriesId}` },
        { label: 'Tạo Chương' },
      ],
    });
  }, []);

  const update = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate(`/mangaka/series/${seriesId}/chapters`); }, 900);
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
          <p className="text-sm text-muted-foreground">{series?.title}</p>
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
              <input type="date" value={form.deadline} onChange={update('deadline')} required className={inputClass} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tải lên trang nháp</CardTitle></CardHeader>
          <MultiUploadBox label="Tải lên trang Manga" />
          <p className="text-xs text-muted-foreground mt-3">Tải lên trang nháp của bạn. Trợ lý sẽ làm việc từ các file này.</p>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(`/mangaka/series/${seriesId}/chapters`)}>Hủy</Button>
          <Button type="submit" variant="primary" loading={loading}>Tạo Chương</Button>
        </div>
      </form>
    </div>
  );
}
