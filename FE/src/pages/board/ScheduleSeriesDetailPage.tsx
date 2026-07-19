import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  CalendarClock,
  ArrowRight,
  Inbox,
  BookOpen,
  Layers3,
  UserRound,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import { PublishingTypeBadge } from '../../app/components/ui/board';
import type { Series } from '../../types/domain';
import {
  getSeries,
  getSeriesChapters,
  getSeriesSchedules,
  getScheduleChapterOptions,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  canSchedulePublishing,
  SUGGESTED_READY_CHAPTERS_BEFORE_PUBLISH,
  type PublishingScheduleItem,
  type ScheduleChapterOption,
} from '../../services/seriesApi';
import { getBoardVoteProgress, type BoardVoteProgress } from '../../services/boardApi';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { computePublishingIssueNumber, formatPublishingIssueLabel } from '../../utils/publishingIssue';

const emptyForm = { frequency: 'weekly', publishDate: '', chapterId: '', notes: '' };
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function isPastPublishDate(isoDate: string): boolean {
  if (!isoDate) return false;
  return isoDate < todayIsoDate();
}

function parseScheduleDate(isoDate: string): Date {
  return parseISO(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate);
}

function formatDisplayDate(isoDate: string): string {
  try {
    return format(parseScheduleDate(isoDate), 'dd/MM/yyyy');
  } catch {
    return isoDate;
  }
}

function shiftPublishDate(isoDate: string, amount: { days?: number; months?: number }): string {
  const base = parseScheduleDate(isoDate);
  const next = amount.months ? addMonths(base, amount.months) : addDays(base, amount.days ?? 0);
  return format(next, 'yyyy-MM-dd');
}

function PostponeMonthGrid({
  month,
  selectedIso,
  lockedIso,
  onMonthChange,
  onSelectIso,
}: {
  month: Date;
  selectedIso: string;
  lockedIso: string;
  onMonthChange: (next: Date) => void;
  onSelectIso: (iso: string) => void;
}) {
  const today = startOfDay(new Date());
  const locked = parseScheduleDate(lockedIso);
  const selected = selectedIso ? parseScheduleDate(selectedIso) : null;

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="mx-auto w-full max-w-[280px] select-none">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          onClick={() => onMonthChange(addMonths(month, -1))}
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium">Tháng {format(month, 'M yyyy')}</p>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map(label => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, month);
          const isLocked = isSameDay(day, locked);
          const isPast = isBefore(startOfDay(day), today);
          const disabled = !inMonth || isLocked || isPast;
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, today);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectIso(iso)}
              className={clsx(
                'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors',
                !inMonth && 'invisible pointer-events-none',
                disabled && inMonth && 'cursor-not-allowed text-muted-foreground/45',
                !disabled && 'hover:bg-muted',
                isToday && !isSelected && 'ring-1 ring-border',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                isLocked && inMonth && 'line-through'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</label>
      {hint ? <span className="text-[11px] text-muted-foreground/80">{hint}</span> : null}
    </div>
  );
}

export default function ScheduleSeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();
  const [series, setSeries] = useState<Series | null>(null);
  const [schedules, setSchedules] = useState<PublishingScheduleItem[]>([]);
  const [chapterOptions, setChapterOptions] = useState<ScheduleChapterOption[]>([]);
  const [productionChapterCount, setProductionChapterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [postponingId, setPostponingId] = useState<string | null>(null);
  const [postponeTarget, setPostponeTarget] = useState<PublishingScheduleItem | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeNotes, setPostponeNotes] = useState('');
  const [postponeMonth, setPostponeMonth] = useState(() => startOfMonth(new Date()));
  const [boardProgress, setBoardProgress] = useState<BoardVoteProgress | null>(null);

  async function load() {
    if (!seriesId) return;
    setLoading(true);
    setError('');
    try {
      const [s, sc, progress, chapters, options] = await Promise.all([
        getSeries(seriesId),
        getSeriesSchedules(seriesId),
        getBoardVoteProgress(seriesId).catch(() => null),
        getSeriesChapters(seriesId).catch(() => []),
        getScheduleChapterOptions(seriesId).catch(() => [] as ScheduleChapterOption[]),
      ]);
      setSeries(s);
      setSchedules(sc);
      setChapterOptions(options);
      setBoardProgress(progress);
      setProductionChapterCount(
        chapters.filter(c => c.number > 0 && (c.status === 'Approved' || c.status === 'Published')).length
          || options.filter(o => o.chapterNumber > 0).length
      );
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

  const bufferShort = productionChapterCount < SUGGESTED_READY_CHAPTERS_BEFORE_PUBLISH;
  const bufferRatio = Math.min(1, productionChapterCount / SUGGESTED_READY_CHAPTERS_BEFORE_PUBLISH);

  const selectableChapters = useMemo(() => {
    return chapterOptions.filter(
      opt => !opt.alreadyScheduled || opt.chapterId === form.chapterId
    );
  }, [chapterOptions, form.chapterId]);

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => a.publishDate.localeCompare(b.publishDate)),
    [schedules]
  );

  const previewIssueNumber = useMemo(
    () => computePublishingIssueNumber(form.publishDate, form.frequency),
    [form.publishDate, form.frequency]
  );

  const openCreate = () => {
    setEditingId(null);
    const maxChapter = Math.max(0, ...chapterOptions.map(o => o.chapterNumber));
    const suggestedChapter = chapterOptions.find(
      opt => !opt.alreadyScheduled && opt.chapterNumber === maxChapter + 1
    ) ?? chapterOptions.find(opt => !opt.alreadyScheduled);
    setForm({
      ...emptyForm,
      frequency: series?.publishingType === 'Monthly' ? 'monthly' : 'weekly',
      chapterId: suggestedChapter?.chapterId ?? '',
    });
    setShowForm(true);
  };

  const openEdit = (row: PublishingScheduleItem) => {
    setEditingId(row.id);
    setForm({
      frequency: row.frequency?.toLowerCase() === 'monthly' ? 'monthly' : 'weekly',
      publishDate: row.publishDate,
      chapterId: row.chapterId ?? '',
      notes: row.notes ?? '',
    });
    setShowForm(true);
  };

  const handleChapterChange = (chapterId: string) => {
    if (chapterId === '__none__') {
      setForm(prev => ({ ...prev, chapterId: '' }));
      return;
    }
    setForm(prev => ({ ...prev, chapterId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId || !form.publishDate) return;

    if (isPastPublishDate(form.publishDate)) {
      toast.error('Không thể chọn ngày phát hành trong quá khứ.');
      return;
    }

    if (!form.chapterId) {
      toast.error('Chọn chương sẽ phát hành trong kỳ này.');
      return;
    }

    if (!editingId && schedules.length === 0 && bufferShort) {
      const ok = await confirm({
        title: 'Chưa đủ chương buffer',
        variant: 'submit',
        message: (
          <>
            Nên có ít nhất{' '}
            <span className="font-semibold text-foreground">{SUGGESTED_READY_CHAPTERS_BEFORE_PUBLISH} chương</span>{' '}
            trước kỳ XB đầu (hiện có{' '}
            <span className="font-semibold text-foreground">{productionChapterCount}</span>).
          </>
        ),
        confirmText: 'Vẫn tạo lịch',
        cancelText: 'Để sau',
      });
      if (!ok) return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        publishDate: form.publishDate,
        frequency: form.frequency,
        chapterId: form.chapterId || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) {
        await updateSchedule(editingId, {
          ...payload,
          clearChapter: !form.chapterId,
        });
      } else {
        await createSchedule(seriesId, payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      const [sc, options] = await Promise.all([
        getSeriesSchedules(seriesId),
        getScheduleChapterOptions(seriesId).catch(() => [] as ScheduleChapterOption[]),
      ]);
      setSchedules(sc);
      setChapterOptions(options);
      toast.success(editingId ? 'Đã cập nhật lịch' : 'Đã tạo lịch');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu lịch.');
    } finally {
      setSaving(false);
    }
  };

  const openPostpone = (row: PublishingScheduleItem) => {
    setPostponeTarget(row);
    setPostponeDate('');
    setPostponeNotes(row.notes ?? '');
    setPostponeMonth(startOfMonth(parseScheduleDate(row.publishDate)));
  };

  const closePostpone = () => {
    if (postponingId) return;
    setPostponeTarget(null);
    setPostponeDate('');
    setPostponeNotes('');
  };

  const postponeFrequency =
    postponeTarget?.frequency?.toLowerCase() === 'monthly' ? 'monthly' : 'weekly';
  const postponeSameDate = Boolean(
    postponeTarget && postponeDate && postponeDate === postponeTarget.publishDate
  );
  const postponePreviewIssue =
    postponeTarget && postponeDate && !postponeSameDate && !isPastPublishDate(postponeDate)
      ? computePublishingIssueNumber(postponeDate, postponeFrequency)
      : null;

  const handlePostponeDateChange = (value: string) => {
    if (!postponeTarget) return;
    if (value && value === postponeTarget.publishDate) {
      setPostponeDate('');
      toast.error(`Ngày mới phải khác ${formatDisplayDate(postponeTarget.publishDate)}.`);
      return;
    }
    setPostponeDate(value);
    if (value) setPostponeMonth(startOfMonth(parseScheduleDate(value)));
  };

  const handlePostponeSubmit = async () => {
    if (!postponeTarget || !seriesId) return;
    if (!postponeDate) {
      toast.error('Chọn ngày phát hành mới.');
      return;
    }
    if (postponeDate === postponeTarget.publishDate) {
      toast.error(`Ngày mới phải khác ${formatDisplayDate(postponeTarget.publishDate)}.`);
      return;
    }
    if (isPastPublishDate(postponeDate)) {
      toast.error('Không thể chọn ngày phát hành trong quá khứ.');
      return;
    }

    setPostponingId(postponeTarget.id);
    setError('');
    try {
      await updateSchedule(postponeTarget.id, {
        publishDate: postponeDate,
        frequency: postponeFrequency,
        notes: postponeNotes.trim() || `Dời lịch sang ${postponeDate}`,
      });
      const sc = await getSeriesSchedules(seriesId);
      setSchedules(sc);
      const newIssue = formatPublishingIssueLabel(
        computePublishingIssueNumber(postponeDate, postponeFrequency)
      );
      toast.success(`Đã dời sang ${formatDisplayDate(postponeDate)} (${newIssue})`);
      setPostponeTarget(null);
      setPostponeDate('');
      setPostponeNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể dời lịch.');
    } finally {
      setPostponingId(null);
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
      const options = await getScheduleChapterOptions(seriesId!).catch(() => [] as ScheduleChapterOption[]);
      setChapterOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa lịch.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-24 rounded-2xl bg-muted/60" />
        <div className="h-48 rounded-2xl bg-muted/40" />
      </div>
    );
  }
  if (!series) return <div className="p-6 text-muted-foreground">{error || 'Không tìm thấy series.'}</div>;

  const canScheduleStatus = canSchedulePublishing(series.status);
  const canManageSchedule = canScheduleStatus && (boardProgress?.canManagePublishingSchedule ?? true);
  const canSchedule = canManageSchedule;

  return (
    <div className="relative min-h-full overflow-y-auto">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.05] to-transparent"
      />

      <div className="relative mx-auto w-full max-w-6xl space-y-5 p-5 sm:p-6 lg:p-8">
        <button
          type="button"
          onClick={() => navigate('/board/publishing-schedule')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={16} /> Lịch xuất bản
        </button>

        {/* Series overview */}
        <section className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
          <div className="grid md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="relative min-h-[320px] overflow-hidden bg-muted md:min-h-[410px]">
              <img
                src={series.coverUrl}
                alt={series.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent md:hidden" />
            </div>

            <div className="flex min-w-0 flex-col p-5 sm:p-7 lg:p-9">
              <div className="flex flex-wrap items-center gap-2">
                <PublishingTypeBadge
                  type={series.publishingType === 'Monthly' ? 'Monthly' : 'Weekly'}
                />
                <Badge status={series.status} statusKind="series" />
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{series.title}</h1>
              <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {series.synopsis || 'Chưa có phần giới thiệu cho series này.'}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-3.5">
                  <UserRound className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Mangaka</p>
                  <p className="mt-1 truncate text-sm font-semibold">{series.mangakaName || '—'}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-3.5">
                  <CalendarDays className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Đã lên lịch</p>
                  <p className="mt-1 text-sm font-semibold">{schedules.length} kỳ phát hành</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-3.5">
                  <Layers3 className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sản xuất</p>
                  <p className="mt-1 text-sm font-semibold">{productionChapterCount} chương sẵn sàng</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-2.5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Buffer trước xuất bản</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Khuyến nghị tối thiểu {SUGGESTED_READY_CHAPTERS_BEFORE_PUBLISH} chương hoàn thiện
                    </p>
                  </div>
                  <span className={clsx('text-lg font-bold tabular-nums', bufferShort ? 'text-amber-700' : 'text-emerald-700')}>
                    {productionChapterCount}/{SUGGESTED_READY_CHAPTERS_BEFORE_PUBLISH}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border/70">
                  <div
                    className={clsx('h-full rounded-full transition-all', bufferShort ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ width: `${Math.max(6, bufferRatio * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/board/approved-series/${series.id}/chapters`)}
                >
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Xem các chương
                </Button>
                {canSchedule && !showForm && (
                  <Button onClick={openCreate}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Thêm kỳ phát hành
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {!canScheduleStatus && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            Series chưa đủ điều kiện lên lịch — chỉ xem lịch hiện có.
          </div>
        )}
        {canScheduleStatus && !canManageSchedule && (
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
            Chỉ board phụ trách chính ({boardProgress?.leadBoardMemberName ?? '—'}) được sắp lịch. Bạn có thể xem.
          </div>
        )}

        {/* Form + list in one panel */}
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {showForm ? (editingId ? 'Sửa lịch' : 'Tạo kỳ mới') : 'Lịch phát hành'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {showForm
                    ? 'Chọn chương và ngày in'
                    : `${sortedSchedules.length} kỳ đã lên lịch`}
                </p>
              </div>
            </div>
            {canSchedule && showForm && (
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X className="mr-1 h-3.5 w-3.5" /> Đóng
              </Button>
            )}
          </div>

          {showForm && canSchedule && (
            <form onSubmit={handleSubmit} className="grid gap-4 border-b border-border/70 bg-primary/[0.03] p-4 sm:grid-cols-2 sm:p-5">
              <div>
                <FieldLabel>Chương phát hành</FieldLabel>
                {selectableChapters.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/70 px-3 py-3 text-sm text-amber-950">
                    Chưa có chương sản xuất. Mangaka cần tạo chương (&gt; 0) trước.
                  </p>
                ) : (
                  <Select value={form.chapterId || undefined} onValueChange={handleChapterChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Chọn chương sẽ in" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableChapters.map(opt => (
                        <SelectItem key={opt.chapterId} value={opt.chapterId}>
                          Ch.{opt.chapterNumber}
                          {opt.title ? ` · ${opt.title}` : ''}
                          {opt.alreadyScheduled && opt.chapterId === form.chapterId ? ' (đang gắn)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <FieldLabel>Ngày phát hành</FieldLabel>
                <Input
                  type="date"
                  min={todayIsoDate()}
                  value={form.publishDate}
                  onChange={e => setForm({ ...form, publishDate: e.target.value })}
                  required
                  className="bg-background"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ngày hôm nay → chương Published ngay. Ngày tương lai → đã lên lịch, Published khi tới ngày (khi mở danh sách chương).
                </p>
              </div>
              <div>
                <FieldLabel>Loại xuất bản</FieldLabel>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel hint="theo ngày XB">Kỳ xếp hạng</FieldLabel>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold">
                  {previewIssueNumber != null
                    ? formatPublishingIssueLabel(previewIssueNumber)
                    : 'Chọn ngày phát hành'}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Cùng tuần/tháng XB → cùng bảng xếp hạng (không theo số chương).
                </p>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel hint="tuỳ chọn">Ghi chú</FieldLabel>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="resize-none bg-background"
                  placeholder="VD: Dời do mangaka nghỉ bệnh…"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving || selectableChapters.length === 0}>
                  {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Tạo lịch'}
                </Button>
              </div>
            </form>
          )}

          {sortedSchedules.length === 0 && !showForm ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Inbox size={20} />
              </span>
              <p className="font-semibold">Chưa có kỳ nào</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Bấm <span className="font-medium text-foreground">Thêm kỳ</span> phía trên để gắn chương với ngày phát hành.
              </p>
            </div>
          ) : sortedSchedules.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {sortedSchedules.map(s => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 min-w-10 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-background px-1.5 text-center">
                      <span className="text-[8px] font-semibold uppercase leading-none text-muted-foreground">XB</span>
                      <span className="mt-0.5 text-[10px] font-bold leading-tight tabular-nums">
                        {s.chapterNumber != null ? `Ch.${s.chapterNumber}` : '—'}
                      </span>
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">{formatDisplayDate(s.publishDate)}</p>
                        <PublishingTypeBadge
                          type={s.frequency?.toLowerCase() === 'monthly' ? 'Monthly' : 'Weekly'}
                        />
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {formatPublishingIssueLabel(s.issueNumber)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {s.chapterNumber != null
                          ? `Ch.${s.chapterNumber}${s.chapterTitle ? ` · ${s.chapterTitle}` : ''}`
                          : <span className="text-amber-700">Chưa gắn chương</span>}
                      </p>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{s.notes}</p>
                      )}
                    </div>
                  </div>
                  {canSchedule && (
                    <div className="flex flex-wrap gap-1 sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={postponingId === s.id}
                        onClick={() => openPostpone(s)}
                        className="border-amber-200/80 bg-amber-50/40 text-amber-950 hover:bg-amber-100"
                      >
                        <CalendarClock className="mr-1 h-3.5 w-3.5" />
                        {postponingId === s.id ? '…' : 'Dời'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <Modal open={Boolean(postponeTarget)} onClose={closePostpone} title="Dời lịch xuất bản" size="lg">
        {postponeTarget && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatPublishingIssueLabel(postponeTarget.issueNumber)}
                {postponeTarget.chapterNumber != null
                  ? ` · Ch.${postponeTarget.chapterNumber}${postponeTarget.chapterTitle ? ` «${postponeTarget.chapterTitle}»` : ''}`
                  : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 font-medium">
                  {formatDisplayDate(postponeTarget.publishDate)}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="inline-flex items-center rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 font-semibold text-primary">
                  {postponeDate ? formatDisplayDate(postponeDate) : 'Chọn ngày mới'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Ngày phát hành mới</FieldLabel>
              <div className="rounded-xl border border-border bg-card p-3">
                <PostponeMonthGrid
                  month={postponeMonth}
                  selectedIso={postponeDate}
                  lockedIso={postponeTarget.publishDate}
                  onMonthChange={setPostponeMonth}
                  onSelectIso={handlePostponeDateChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Bấm một ngày trên lịch (ngày {formatDisplayDate(postponeTarget.publishDate)} bị khóa).
                Hoặc dùng phím tắt bên dưới.
              </p>
              {postponePreviewIssue != null && (
                <p className="text-xs font-medium text-foreground">
                  Đợt xếp hạng mới: {formatPublishingIssueLabel(postponePreviewIssue)}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '+3 ngày', amount: { days: 3 } },
                  { label: '+7 ngày', amount: { days: 7 } },
                  { label: '+14 ngày', amount: { days: 14 } },
                  { label: '+1 tháng', amount: { months: 1 } },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      handlePostponeDateChange(
                        shiftPublishDate(postponeTarget.publishDate, preset.amount)
                      )
                    }
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel hint="tuỳ chọn">Lý do dời lịch</FieldLabel>
              <Textarea
                id="postpone-notes"
                rows={3}
                value={postponeNotes}
                onChange={e => setPostponeNotes(e.target.value)}
                className="resize-none"
                placeholder="VD: Mangaka nghỉ bệnh, sự cố studio…"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closePostpone} disabled={Boolean(postponingId)}>
                Hủy
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => void handlePostponeSubmit()}
                disabled={Boolean(postponingId) || !postponeDate || postponeSameDate}
              >
                {postponingId ? 'Đang dời…' : 'Xác nhận dời lịch'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
