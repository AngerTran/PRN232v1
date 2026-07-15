import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, CalendarClock, FileText, Images, Hash } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardTitle } from '../../components/ui/Card';
import UploadBox, { MultiUploadBox } from '../../components/ui/UploadBox';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  createChapter,
  getSeries,
  getSeriesChapters,
  canMangakaProduceOnSeries,
  SERIES_PRODUCTION_LOCK_HINT,
  uploadChapterManuscript,
} from '../../services/seriesApi';
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
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productionBlocked, setProductionBlocked] = useState<string | null>(null);

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
        if (!canMangakaProduceOnSeries(series.status)) {
          setProductionBlocked(
            SERIES_PRODUCTION_LOCK_HINT[series.status] ?? 'Series chưa được phê duyệt — không thể tạo chương.'
          );
        } else {
          setProductionBlocked(null);
        }
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
    if (!seriesId || productionBlocked) return;
    setError(null);
    setLoading(true);
    try {
      const created = await createChapter({
        seriesId,
        chapterNumber: Number(form.number) || 1,
        title: form.title || undefined,
        deadline: form.deadline || undefined,
      });

      if (manuscriptFile) {
        await uploadChapterManuscript(created.id, manuscriptFile);
      }

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

  const inputClass =
    'w-full px-4 py-2.5 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-colors';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5';

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative p-5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-5">
        {productionBlocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {productionBlocked}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/mangaka/series/${seriesId}/chapters`)}
                className="mt-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">Tạo chương mới</h1>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{seriesTitle || '—'}</p>
                {!productionBlocked && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock size={12} />
                    Hạn nộp có thể chỉnh — dời khi cần
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/mangaka/series/${seriesId}/chapters`)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" loading={loading} disabled={Boolean(productionBlocked)}>
                Tạo chương
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
            {/* Cột trái: thông tin chương */}
            <Card padding="none" className="xl:col-span-3 overflow-hidden border-border/80 shadow-sm">
              <div className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-foreground/[0.03] to-transparent">
                <CardTitle className="mb-0 flex items-center gap-2">
                  <Hash size={14} className="text-muted-foreground" />
                  Chi tiết chương
                </CardTitle>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <label className={labelClass}>Số chương</label>
                    <input
                      type="number"
                      value={form.number}
                      onChange={update('number')}
                      required
                      className={inputClass}
                      min={1}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={labelClass}>Tiêu đề chương *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={update('title')}
                      required
                      placeholder="Nhập tiêu đề chương…"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={update('description')}
                    rows={5}
                    placeholder="Tóm tắt ngắn về nội dung chương này…"
                    className={`${inputClass} resize-y min-h-[120px]`}
                  />
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-2">
                  <label className={`${labelClass} flex items-center gap-1.5 mb-0`}>
                    <CalendarClock size={12} />
                    Hạn nộp *
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={update('deadline')}
                    required
                    className={`${inputClass} max-w-xs`}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isWeekly
                      ? 'Series weekly: gợi ý +7 ngày từ hạn gần nhất — chỉnh lại nếu cần dời hạn (sự cố, sức khỏe…).'
                      : 'Chọn hạn nộp phù hợp tiến độ studio. Có thể dời sau khi tạo nếu cần.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Cột phải: tải file */}
            <div className="xl:col-span-2 space-y-5">
              <Card padding="none" className="overflow-hidden border-border/80 shadow-sm">
                <div className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-foreground/[0.03] to-transparent">
                  <CardTitle className="mb-0 flex items-center gap-2">
                    <FileText size={14} className="text-muted-foreground" />
                    Bản thảo chương
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Tuỳ chọn — PDF / ZIP / CBZ</p>
                </div>
                <div className="p-4">
                  <UploadBox
                    label="Tải bản thảo chương"
                    accept=".pdf,.zip,.cbz"
                    hint="File bản thảo đầy đủ (không bắt buộc)"
                    onChange={file => setManuscriptFile(file)}
                  />
                </div>
              </Card>

              <Card padding="none" className="overflow-hidden border-border/80 shadow-sm">
                <div className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-foreground/[0.03] to-transparent">
                  <CardTitle className="mb-0 flex items-center gap-2">
                    <Images size={14} className="text-muted-foreground" />
                    Trang nháp
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFiles.length > 0
                      ? `Đã chọn ${selectedFiles.length} trang`
                      : 'Trợ lý sẽ làm việc từ các trang này'}
                  </p>
                </div>
                <div className="p-4">
                  <MultiUploadBox label="Tải lên trang manga" onChange={setSelectedFiles} />
                </div>
              </Card>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
