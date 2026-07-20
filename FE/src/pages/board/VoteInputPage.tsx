import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  History,
  Save,
  Vote,
  Trash2,
  Sparkles,
  Search,
  Plus,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Checkbox } from '../../app/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import {
  bulkSaveRankings,
  deleteAllRankingInputs,
  deleteRankingInputs,
  getRecentRankingInputs,
  getVoteInputContext,
  type RecentRankingInput,
  type VoteInputSeriesRow,
} from '../../services/boardApi';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { SERIES_STATUS_LABELS } from '../../utils/statusLabels';
import { formatPublishingIssueLabel } from '../../utils/publishingIssue';
import type { SeriesStatus } from '../../types/domain';
import { clsx } from 'clsx';

type RowDraft = {
  voteCount: string;
  popularityScore: string;
  notes: string;
};

function rowKey(seriesId: string) {
  return seriesId;
}

function initDraft(row: VoteInputSeriesRow): RowDraft {
  return {
    voteCount: row.existingVoteCount != null ? String(row.existingVoteCount) : '',
    popularityScore: row.existingPopularityScore != null ? String(row.existingPopularityScore) : '',
    notes: row.existingNotes ?? '',
  };
}

function emptyDraft(): RowDraft {
  return { voteCount: '', popularityScore: '', notes: '' };
}

function formatInputDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toLocaleString('vi-VN');
}

function mapApiStatusToLabel(status: string): string {
  const key = status.trim().toLowerCase();
  const mapped: Record<string, SeriesStatus> = {
    approved: 'Approved',
    publishing: 'In Progress',
    completed: 'Completed',
    hiatus: 'At Risk',
    pending_review: 'Submitted',
    draft: 'Draft',
    cancelled: 'Cancelled',
  };
  const feStatus = mapped[key];
  return feStatus ? (SERIES_STATUS_LABELS[feStatus] ?? status) : status;
}

function isDraftFilled(draft?: RowDraft): boolean {
  return Boolean(draft?.voteCount.trim());
}

export default function VoteInputPage() {
  usePageMeta({ title: 'Nhập Vote Độc Giả' });
  const confirm = useConfirm();
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [rows, setRows] = useState<VoteInputSeriesRow[]>([]);
  const [availableIssues, setAvailableIssues] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [recentInputs, setRecentInputs] = useState<RecentRankingInput[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [seriesQuery, setSeriesQuery] = useState('');
  const [form, setForm] = useState<RowDraft>(emptyDraft());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await getRecentRankingInputs(50);
      setRecentInputs(items);
      setSelectedIds(prev => {
        const valid = new Set(items.map(item => item.id));
        return new Set([...prev].filter(id => valid.has(id)));
      });
    } catch {
      setRecentInputs([]);
      setSelectedIds(new Set());
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const load = useCallback(async (issue?: number) => {
    setLoading(true);
    setError('');
    try {
      const ctx = await getVoteInputContext(issue);
      setIssueNumber(issue ?? ctx.suggestedIssueNumber);
      setAvailableIssues(ctx.availableIssueNumbers);
      setRows(ctx.series);
      setDrafts(Object.fromEntries(ctx.series.map(row => [rowKey(row.seriesId), initDraft(row)])));
      setSelectedSeriesId('');
      setForm(emptyDraft());
      setSeriesQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ranking.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  const issueOptions = useMemo(() => {
    const set = new Set(availableIssues);
    if (issueNumber != null) set.add(issueNumber);
    return [...set].sort((a, b) => b - a);
  }, [availableIssues, issueNumber]);

  const selectedRow = useMemo(
    () => rows.find(r => r.seriesId === selectedSeriesId) ?? null,
    [rows, selectedSeriesId]
  );

  const filteredSeries = useMemo(() => {
    const q = seriesQuery.trim().toLowerCase();
    const list = [...rows].sort((a, b) => {
      const aSched = a.scheduleCountForIssue > 0 ? 0 : 1;
      const bSched = b.scheduleCountForIssue > 0 ? 0 : 1;
      if (aSched !== bSched) return aSched - bSched;
      return a.title.localeCompare(b.title, 'vi');
    });
    if (!q) return list;
    return list.filter(r =>
      r.title.toLowerCase().includes(q)
      || mapApiStatusToLabel(r.status).toLowerCase().includes(q)
    );
  }, [rows, seriesQuery]);

  const pendingRows = useMemo(
    () => rows.filter(r => isDraftFilled(drafts[rowKey(r.seriesId)])),
    [rows, drafts]
  );

  const scheduledCount = useMemo(
    () => rows.filter(r => r.scheduleCountForIssue > 0).length,
    [rows]
  );

  const allSelected = recentInputs.length > 0 && selectedIds.size === recentInputs.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < recentInputs.length;

  const selectSeries = (seriesId: string) => {
    const row = rows.find(r => r.seriesId === seriesId);
    if (!row) return;
    setSelectedSeriesId(seriesId);
    setForm(drafts[rowKey(seriesId)] ?? initDraft(row));
    setSeriesQuery(row.title);
    setPickerOpen(false);
    setSaved(false);
  };

  const applyFormToDraft = () => {
    if (!selectedSeriesId) {
      setError('Chọn series trước khi thêm vào danh sách.');
      return;
    }
    if (!form.voteCount.trim()) {
      setError('Nhập số vote trước khi thêm.');
      return;
    }
    const voteCount = Number(form.voteCount);
    if (!Number.isFinite(voteCount) || voteCount < 0) {
      setError('Số vote không hợp lệ.');
      return;
    }

    setDrafts(prev => ({
      ...prev,
      [selectedSeriesId]: {
        voteCount: form.voteCount.trim(),
        popularityScore: form.popularityScore.trim(),
        notes: form.notes,
      },
    }));
    setError('');
    setSaved(false);
    toast.success(`Đã thêm «${selectedRow?.title ?? 'series'}» vào danh sách lưu.`);
  };

  const removePending = (seriesId: string) => {
    setDrafts(prev => ({
      ...prev,
      [seriesId]: emptyDraft(),
    }));
    if (selectedSeriesId === seriesId) setForm(emptyDraft());
    setSaved(false);
  };

  const handleIssueChange = async (value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 1) return;
    await load(next);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(recentInputs.map(item => item.id)) : new Set());
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const ok = await confirm({
      title: 'Xóa dòng đã chọn',
      variant: 'danger',
      message: (
        <>
          Xóa <span className="font-semibold text-foreground">{ids.length}</span> dòng vote đã chọn?
          <br />Hạng của đợt liên quan sẽ được tính lại.
        </>
      ),
      confirmText: `Xóa ${ids.length} dòng`,
    });
    if (!ok) return;

    setDeleting(true);
    setError('');
    try {
      const deleted = await deleteRankingInputs(ids);
      setSelectedIds(new Set());
      await Promise.all([load(issueNumber ?? undefined), loadHistory()]);
      toast.success(deleted > 0 ? `Đã xóa ${deleted} dòng.` : 'Không có dòng nào được xóa.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa dòng đã chọn.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (recentInputs.length === 0) return;

    const ok = await confirm({
      title: 'Xóa toàn bộ lịch sử vote',
      variant: 'danger',
      message: (
        <>
          Xóa <span className="font-semibold text-foreground">tất cả</span> dữ liệu vote/xếp hạng đã nhập?
          <br />Hành động này không thể hoàn tác.
        </>
      ),
      confirmText: 'Xóa tất cả',
    });
    if (!ok) return;

    setDeleting(true);
    setError('');
    try {
      const deleted = await deleteAllRankingInputs();
      setSelectedIds(new Set());
      await Promise.all([load(), loadHistory()]);
      toast.success(deleted > 0 ? `Đã xóa toàn bộ ${deleted} dòng.` : 'Không còn dữ liệu để xóa.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa toàn bộ dữ liệu.');
    } finally {
      setDeleting(false);
    }
  };

  const submit = async () => {
    if (issueNumber == null) return;
    const entries = pendingRows
      .map(row => {
        const draft = drafts[rowKey(row.seriesId)];
        if (!draft?.voteCount.trim()) return null;
        const voteCount = Number(draft.voteCount);
        if (!Number.isFinite(voteCount) || voteCount < 0) return null;
        return {
          seriesId: row.seriesId,
          voteCount,
          popularityScore: Number(draft.popularityScore) || 0,
          notes: draft.notes.trim() || undefined,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e != null);

    if (entries.length === 0) {
      setError('Thêm ít nhất một series (có số vote) trước khi lưu.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await bulkSaveRankings(issueNumber, entries);
      setSaved(true);
      await Promise.all([load(issueNumber), loadHistory()]);
      toast.success(`Đã lưu ${entries.length} series · ${formatPublishingIssueLabel(issueNumber)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ranking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-6">
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Vote className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Nhập vote độc giả</h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Chọn series → nhập vote/phổ biến → thêm vào danh sách → lưu một lần.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 shrink-0">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Đợt xuất bản
            </label>
            <Select value={issueNumber != null ? String(issueNumber) : undefined} onValueChange={handleIssueChange}>
              <SelectTrigger className="min-w-[12rem] bg-background">
                <SelectValue placeholder="Chọn đợt" />
              </SelectTrigger>
              <SelectContent>
                {issueOptions.map(n => (
                  <SelectItem key={n} value={String(n)}>{formatPublishingIssueLabel(n)}</SelectItem>
                ))}
                {issueNumber != null && !issueOptions.includes(issueNumber) && (
                  <SelectItem value={String(issueNumber)}>{formatPublishingIssueLabel(issueNumber)}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
          <span><strong className="text-foreground">{rows.length}</strong> series</span>
          <span><strong className="text-foreground">{scheduledCount}</strong> có lịch đợt này</span>
          <span><strong className="text-foreground">{pendingRows.length}</strong> chờ lưu</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Hạng tự tính sau khi lưu
          </span>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={16} /> Đã lưu {formatPublishingIssueLabel(issueNumber)}.
        </p>
      )}

      <Card className="overflow-visible border-border/80 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nhập theo series</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tìm và chọn series — không cần kéo cả bảng dài khi có nhiều bộ.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có series để nhập. Duyệt series và lên lịch XB trước.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Series</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Tìm theo tên series…"
                    value={seriesQuery}
                    onChange={e => {
                      setSeriesQuery(e.target.value);
                      setPickerOpen(true);
                    }}
                    onFocus={() => setPickerOpen(true)}
                    onBlur={() => {
                      // Delay để click item kịp chạy
                      window.setTimeout(() => setPickerOpen(false), 150);
                    }}
                  />
                  {pickerOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
                      {filteredSeries.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-muted-foreground">Không tìm thấy series</p>
                      ) : (
                        filteredSeries.map(row => {
                          const filled = isDraftFilled(drafts[rowKey(row.seriesId)]);
                          return (
                            <button
                              key={row.seriesId}
                              type="button"
                              className={clsx(
                                'flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60',
                                selectedSeriesId === row.seriesId && 'bg-primary/5'
                              )}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => selectSeries(row.seriesId)}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{row.title}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {mapApiStatusToLabel(row.status)}
                                  {row.scheduleCountForIssue > 0
                                    ? ` · ${row.scheduleCountForIssue} lịch kỳ này`
                                    : ' · chưa có lịch kỳ này'}
                                </p>
                              </div>
                              {filled && (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Đã nhập
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                {selectedRow && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    {selectedRow.scheduleCountForIssue > 0 ? (
                      <>
                        <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                        Có {selectedRow.scheduleCountForIssue} lịch đúng đợt này
                      </>
                    ) : (
                      'Series chưa gắn lịch đợt này — vẫn nhập vote được'
                    )}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Vote</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    disabled={!selectedSeriesId}
                    value={form.voteCount}
                    onChange={e => setForm(prev => ({ ...prev, voteCount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phổ biến</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="0"
                    disabled={!selectedSeriesId}
                    value={form.popularityScore}
                    onChange={e => setForm(prev => ({ ...prev, popularityScore: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ghi chú (tuỳ chọn)</label>
                <Input
                  placeholder="Nhận xét kỳ này…"
                  disabled={!selectedSeriesId}
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={applyFormToDraft} disabled={!selectedSeriesId}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm / cập nhật danh sách
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedSeriesId}
                  onClick={() => {
                    if (!selectedSeriesId) return;
                    const row = rows.find(r => r.seriesId === selectedSeriesId);
                    setForm(row ? initDraft(row) : emptyDraft());
                  }}
                >
                  Đặt lại form
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-base">Danh sách chờ lưu</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingRows.length === 0
                ? 'Chưa có series nào — chọn và thêm ở form phía trên'
                : `${pendingRows.length} series sẽ được lưu cho ${formatPublishingIssueLabel(issueNumber)}`}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={saving || loading || pendingRows.length === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Đang lưu…' : `Lưu kết quả (${pendingRows.length})`}
          </Button>
        </CardHeader>
        <CardContent>
          {pendingRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Danh sách trống. Mỗi lần chọn một series, nhập vote, rồi bấm «Thêm / cập nhật danh sách».
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Series</th>
                    <th className="py-2 px-2 font-medium w-24 text-right">Vote</th>
                    <th className="py-2 px-2 font-medium w-28 text-right">Phổ biến</th>
                    <th className="py-2 px-2 font-medium">Ghi chú</th>
                    <th className="py-2 pl-2 font-medium w-24 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingRows.map(row => {
                    const draft = drafts[rowKey(row.seriesId)];
                    return (
                      <tr key={row.seriesId} className="group">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium">{row.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {row.scheduleCountForIssue > 0
                              ? `${row.scheduleCountForIssue} lịch kỳ này`
                              : 'Chưa có lịch kỳ này'}
                          </p>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold tabular-nums">
                          {Number(draft.voteCount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-muted-foreground">
                          {(Number(draft.popularityScore) || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground max-w-[200px] truncate">
                          {draft.notes.trim() || '—'}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              title="Sửa"
                              onClick={() => selectSeries(row.seriesId)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              title="Bỏ khỏi danh sách"
                              onClick={() => removePending(row.seriesId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Lịch sử nhập gần đây
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {historyLoading
                ? 'Đang tải...'
                : `${recentInputs.length} dòng · chọn từng dòng hoặc xóa tất cả`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting || historyLoading || selectedIds.size === 0}
              onClick={() => void handleDeleteSelected()}
              className="text-destructive border-destructive/25 hover:bg-destructive/5"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {deleting ? 'Đang xóa…' : `Xóa đã chọn (${selectedIds.size})`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting || historyLoading || recentInputs.length === 0}
              onClick={() => void handleDeleteAll()}
              className="text-destructive border-destructive/25 hover:bg-destructive/5"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Xóa tất cả
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Đang tải lịch sử...</p>
          ) : recentInputs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chưa có lần nhập nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="w-10 py-2 pr-2">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={value => toggleSelectAll(value === true)}
                        aria-label="Chọn tất cả"
                      />
                    </th>
                    <th className="py-2 pr-3 font-medium">Ngày nhập</th>
                    <th className="py-2 px-2 font-medium">Đợt XB</th>
                    <th className="py-2 px-2 font-medium">Series</th>
                    <th className="py-2 px-2 font-medium w-20 text-right">Vote</th>
                    <th className="py-2 px-2 font-medium w-24 text-right">Phổ biến</th>
                    <th className="py-2 pl-2 font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInputs.map(item => {
                    const checked = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={checked ? 'bg-primary/[0.04]' : undefined}
                      >
                        <td className="py-2 pr-2 align-middle">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={value => toggleSelect(item.id, value === true)}
                            aria-label={`Chọn ${item.seriesTitle ?? item.seriesId}`}
                          />
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {formatInputDate(item.createdAt)}
                        </td>
                        <td className="py-2 px-2 font-medium whitespace-nowrap">
                          {formatPublishingIssueLabel(item.issueNumber)}
                        </td>
                        <td className="py-2 px-2">{item.seriesTitle ?? item.seriesId.slice(0, 8)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{item.voteCount.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{item.popularityScore.toLocaleString()}</td>
                        <td className="py-2 pl-2 text-muted-foreground max-w-xs truncate" title={item.notes}>
                          {item.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
