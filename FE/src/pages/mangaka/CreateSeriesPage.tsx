import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Check } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import UploadBox from '../../components/ui/UploadBox';
import { usePageMeta } from '../../hooks/usePageMeta';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];
const AUDIENCES = ['Shōnen (12-18)', 'Shōjo (12-18)', 'Seinen (18-35)', 'Josei (20-40)', 'Kodomomuke (Trẻ em)'];
const PUBLISHING_TYPES = ['Hàng tuần', 'Hai tuần một lần', 'Hàng tháng'];

interface FormState {
  title: string;
  genres: string[];
  synopsis: string;
  targetAudience: string;
  publishingType: string;
  mainCharacters: string;
  coverUrl: string;
}

export default function CreateSeriesPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const [form, setForm] = useState<FormState>({
    title: '', genres: [], synopsis: '', targetAudience: AUDIENCES[0],
    publishingType: 'Weekly', mainCharacters: '', coverUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: 'Tạo Series',
      breadcrumb: [{ label: 'Series của tôi', href: '/mangaka/series' }, { label: 'Tạo Series' }],
    });
  }, []);

  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre) ? f.genres.filter(g => g !== genre) : [...f.genres, genre],
    }));
  };

  const update = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSaveDraft = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate('/mangaka/series'); }, 1500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); navigate('/mangaka/submissions'); }, 1200);
  };

  const inputClass = 'w-full px-4 py-2.5 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-colors';

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/mangaka/series')} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Tạo Series Mới</h1>
          <p className="text-sm text-muted-foreground">Gửi đề xuất series đến ban biên tập.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <Card>
          <CardHeader><CardTitle>Thông tin cơ bản</CardTitle></CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Tiêu đề Series *</label>
              <input type="text" value={form.title} onChange={update('title')} required
                placeholder="Nhập tiêu đề series…"
                className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Thể loại *</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                      form.genres.includes(genre)
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {form.genres.includes(genre) && <Check size={10} className="inline mr-1" />}
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Tóm tắt *</label>
              <textarea value={form.synopsis} onChange={update('synopsis')} required rows={5}
                placeholder="Mô tả ý tưởng, tiền đề và xung đột chính của câu chuyện…"
                className={`${inputClass} resize-none`} />
              <p className="text-xs text-muted-foreground mt-1">{form.synopsis.length}/500 ký tự</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Đối tượng độc giả</label>
                <select value={form.targetAudience} onChange={update('targetAudience')} className={inputClass}>
                  {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Lịch xuất bản</label>
                <select value={form.publishingType} onChange={update('publishingType')} className={inputClass}>
                  {PUBLISHING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Characters */}
        <Card>
          <CardHeader><CardTitle>Nhân vật chính</CardTitle></CardHeader>
          <textarea value={form.mainCharacters} onChange={update('mainCharacters')} rows={4}
            placeholder="Mô tả nhân vật chính — tên, tính cách, vai trò trong câu chuyện…"
            className={`${inputClass} resize-none`} />
        </Card>

        {/* Assets */}
        <Card>
          <CardHeader><CardTitle>Tài nguyên Series</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ảnh bìa</label>
              <UploadBox label="Tải lên ảnh bìa" accept="image/*" hint="Khuyến nghị: 280×380px, JPG/PNG" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Bản thảo nháp</label>
              <UploadBox label="Tải lên bản thảo" accept=".pdf,.zip,.cbz" hint="PDF hoặc ZIP của trang nháp" />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            {saved ? '✓ Đã lưu bản nháp' : 'Lưu bản nháp'}
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Gửi đến Ban Biên Tập
          </Button>
        </div>
      </form>
    </div>
  );
}
