import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, Check } from 'lucide-react';
import { clsx } from 'clsx';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import UploadBox from '../../components/ui/UploadBox';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  buildSeriesDescription,
  getSeries,
  getSeriesChapters,
  parseSeriesDescription,
  updateSeriesProfile,
  uploadSeriesCover,
  upsertSeriesProposalManuscript,
} from '../../services/seriesApi';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];
const AUDIENCES = ['Shōnen (12-18)', 'Shōjo (12-18)', 'Seinen (18-35)', 'Josei (20-40)', 'Kodomomuke (Trẻ em)'];
const PUBLISHING_OPTIONS = [
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'biweekly', label: 'Hai tuần một lần' },
  { value: 'monthly', label: 'Hàng tháng' },
];

interface FormState {
  title: string;
  genres: string[];
  synopsis: string;
  targetAudience: string;
  publishingType: string;
  mainCharacters: string;
}

export default function EditSeriesPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const manuscriptRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    title: '', genres: [], synopsis: '', targetAudience: AUDIENCES[0],
    publishingType: 'weekly', mainCharacters: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [existingManuscriptUrl, setExistingManuscriptUrl] = useState('');
  const [proposalChapterId, setProposalChapterId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!seriesId) return;

    let active = true;
    setLoading(true);
    Promise.all([getSeries(seriesId), getSeriesChapters(seriesId)])
      .then(([series, chapters]) => {
        if (!active) return;
        if (series.status !== 'Draft' && series.status !== 'Cancelled') {
          navigate(`/mangaka/series/${seriesId}`, { replace: true });
          return;
        }

        const { synopsis, mainCharacters } = parseSeriesDescription(series.synopsis);
        const genres = series.genres?.length
          ? series.genres
          : series.genre.split(',').map(g => g.trim()).filter(Boolean);

        setForm({
          title: series.title,
          genres,
          synopsis: synopsis || series.synopsis,
          targetAudience: series.targetAudience || AUDIENCES[0],
          publishingType: series.publishingType?.toLowerCase().includes('month') ? 'monthly'
            : series.publishingType?.toLowerCase().includes('hai') ? 'biweekly' : 'weekly',
          mainCharacters,
        });
        setCoverPreview(series.coverUrl);

        const proposal = chapters.find(c => c.number === 0);
        setProposalChapterId(proposal?.id);
        setExistingManuscriptUrl(proposal?.description ?? '');

        setPageMeta({
          title: 'Chỉnh sửa Series',
          breadcrumb: [
            { label: 'Series của tôi', href: '/mangaka/series' },
            { label: series.title, href: `/mangaka/series/${seriesId}` },
            { label: 'Chỉnh sửa' },
          ],
        });
      })
      .catch(() => {
        if (active) setError('Không thể tải series.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [seriesId, navigate, setPageMeta]);

  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre) ? f.genres.filter(g => g !== genre) : [...f.genres, genre],
    }));
  };

  const update = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!seriesId) return;

    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề series.');
      return;
    }
    if (form.genres.length === 0) {
      setError('Vui lòng chọn ít nhất một thể loại.');
      return;
    }
    if (!form.synopsis.trim()) {
      setError('Vui lòng nhập tóm tắt series.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await updateSeriesProfile(seriesId, {
        title: form.title.trim(),
        description: buildSeriesDescription(form.synopsis, form.mainCharacters),
        genre: form.genres.join(', '),
        targetAudience: form.targetAudience,
        publishingFrequency: form.publishingType,
      });

      if (coverFile) {
        await uploadSeriesCover(seriesId, coverFile);
      }

      if (manuscriptFile) {
        await upsertSeriesProposalManuscript(seriesId, manuscriptFile, proposalChapterId);
      }

      navigate(`/mangaka/series/${seriesId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu thay đổi.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-colors';

  if (loading) {
    return <div className="p-6"><EmptyState title="Đang tải series..." /></div>;
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="flex-1 min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/mangaka/series/${seriesId}`)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Chỉnh sửa hồ sơ Series</h1>
              <p className="text-sm text-muted-foreground">Cập nhật thông tin và bản thảo trước khi gửi xét duyệt.</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium" role="alert">
              {error}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Thông tin cơ bản</CardTitle></CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Tiêu đề Series *</label>
                <input type="text" value={form.title} onChange={update('title')} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Thể loại *</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(genre => (
                    <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150',
                        form.genres.includes(genre)
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-card border-border text-muted-foreground hover:border-foreground/30',
                      )}
                    >
                      {form.genres.includes(genre) && <Check size={10} className="inline mr-1" />}
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Tóm tắt *</label>
                <textarea value={form.synopsis} onChange={update('synopsis')} rows={5} className={clsx(inputClass, 'resize-none')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Đối tượng độc giả</label>
                  <select value={form.targetAudience} onChange={update('targetAudience')} className={inputClass}>
                    {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Lịch xuất bản</label>
                  <select value={form.publishingType} onChange={update('publishingType')} className={inputClass}>
                    {PUBLISHING_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Nhân vật chính</CardTitle></CardHeader>
            <textarea value={form.mainCharacters} onChange={update('mainCharacters')} rows={4} className={clsx(inputClass, 'resize-none')} />
          </Card>
        </div>
      </div>

      <aside className="shrink-0 w-full lg:w-[min(380px,36vw)] lg:min-w-[280px] lg:max-w-[420px] lg:min-h-0 lg:overflow-y-auto border-t lg:border-t-0 lg:border-l border-border bg-background p-6 space-y-5">
        <Card>
          <CardHeader><CardTitle>Tài nguyên Series</CardTitle></CardHeader>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ảnh bìa</label>
              {coverPreview && !coverFile && (
                <img src={coverPreview} alt="Ảnh bìa hiện tại" className="mb-2 h-32 w-auto rounded-lg border border-border object-cover" />
              )}
              <UploadBox label="Thay ảnh bìa" accept="image/*" hint="JPG/PNG — để trống nếu giữ ảnh cũ" onChange={file => setCoverFile(file)} />
            </div>
            <div ref={manuscriptRef}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Bản thảo đề xuất</label>
              {existingManuscriptUrl && !manuscriptFile && (
                <p className="text-xs text-muted-foreground mb-2">
                  Đã có file đính kèm —{' '}
                  <a href={existingManuscriptUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                    xem bản thảo hiện tại
                  </a>
                </p>
              )}
              <UploadBox
                label={existingManuscriptUrl ? 'Thay bản thảo' : 'Tải bản thảo'}
                accept=".pdf,.zip,.cbz"
                hint="PDF hoặc ZIP — bắt buộc trước khi gửi xét duyệt"
                onChange={file => setManuscriptFile(file)}
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/mangaka/series/${seriesId}`)}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            Lưu thay đổi
          </Button>
        </div>
      </aside>
    </form>
  );
}
