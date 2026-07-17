import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, History, Save, Vote, CalendarDays, CircleDashed, Trash2, Sparkles } from 'lucide-react';
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

function SeriesVoteTable({
  rows,
  drafts,
  updateDraft,
}: {
  rows: VoteInputSeriesRow[];
  drafts: Record<string, RowDraft>;
  updateDraft: (seriesId: string, patch: Partial<RowDraft>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Series</th>
            <th className="py-2 px-2 font-medium w-28">Trạng thái</th>
            <th className="py-2 px-2 font-medium w-28">Vote</th>
            <th className="py-2 px-2 font-medium w-28">Phổ biến</th>
            <th className="py-2 px-2 font-medium min-w-[160px]">Ghi chú</th>
            <th className="py-2 pl-2 font-medium w-20 text-right">Lịch kỳ</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => {
            const draft = drafts[rowKey(row.seriesId)] ?? initDraft(row);
            return (
              <tr key={row.seriesId}>
                <td className="py-2 pr-3 font-medium">{row.title}</td>
                <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                  {mapApiStatusToLabel(row.status)}
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={draft.voteCount}
                    onChange={e => updateDraft(row.seriesId, { voteCount: e.target.value })}
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="0"
                    value={draft.popularityScore}
                    onChange={e => updateDraft(row.seriesId, { popularityScore: e.target.value })}
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    placeholder="Nhận xét kỳ này…"
                    value={draft.notes}
                    onChange={e => updateDraft(row.seriesId, { notes: e.target.value })}
                  />
                </td>
                <td className="py-2 pl-2 text-right text-muted-foreground">
                  {row.scheduleCountForIssue > 0 ? `${row.scheduleCountForIssue} lịch` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

  const scheduledForIssue = useMemo(
    () => rows.filter(row => row.scheduleCountForIssue > 0),
    [rows]
  );
  const withoutScheduleForIssue = useMemo(
    () => rows.filter(row => row.scheduleCountForIssue <= 0),
    [rows]
  );

  const filledCount = useMemo(
    () => Object.values(drafts).filter(d => d.voteCount.trim() !== '').length,
    [drafts]
  );

  const allSelected = recentInputs.length > 0 && selectedIds.size === recentInputs.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < recentInputs.length;

  const updateDraft = (seriesId: string, patch: Partial<RowDraft>) => {
    setDrafts(prev => ({
      ...prev,
      [seriesId]: { ...prev[seriesId], ...patch },
    }));
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
    const entries = rows
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
      setError('Nhập ít nhất một số vote trước khi lưu.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await bulkSaveRankings(issueNumber, entries);
      setSaved(true);
      await Promise.all([load(issueNumber), loadHistory()]);
      toast.success(`Đã lưu ${formatPublishingIssueLabel(issueNumber)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ranking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-5 sm:p-6">
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Vote className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nhập vote độc giả</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Nhập lượt vote và điểm phổ biến. Hệ thống tự tính hạng; hòa cả hai tiêu chí sẽ đồng hạng.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
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

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:px-6">
          <span><strong className="text-foreground">{rows.length}</strong> series đang xuất bản</span>
          <span><strong className="text-foreground">{scheduledForIssue.length}</strong> series có lịch đợt này</span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Hạng được tính sau khi lưu
          </span>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={16} /> Đã lưu {formatPublishingIssueLabel(issueNumber)}.
        </p>
      )}

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Vote className="h-4 w-4" />
              Series đang xuất bản
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {loading
                ? 'Đang tải...'
                : `${rows.length} series · ${formatPublishingIssueLabel(issueNumber)} · ${scheduledForIssue.length} có lịch đợt này`}
            </p>
          </div>
          <Button type="button" onClick={submit} disabled={saving || loading || filledCount === 0}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Đang lưu...' : 'Lưu kết quả vote'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Đang tải...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Chưa có series đang xuất bản. Duyệt series và lên lịch XB trước.
            </p>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Có lịch {formatPublishingIssueLabel(issueNumber)}</p>
                    <p className="text-xs text-muted-foreground">{scheduledForIssue.length} series khớp đợt XB này</p>
                  </div>
                </div>
                {scheduledForIssue.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border px-4 py-6 text-center">
                    Chưa series nào có lịch đúng đợt này.
                  </p>
                ) : (
                  <SeriesVoteTable
                    rows={scheduledForIssue}
                    drafts={drafts}
                    updateDraft={updateDraft}
                  />
                )}
              </section>

              {withoutScheduleForIssue.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                      <CircleDashed className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Chưa gắn lịch {formatPublishingIssueLabel(issueNumber)}</p>
                      <p className="text-xs text-muted-foreground">
                        Vẫn nhập vote được — {withoutScheduleForIssue.length} series
                      </p>
                    </div>
                  </div>
                  <SeriesVoteTable
                    rows={withoutScheduleForIssue}
                    drafts={drafts}
                    updateDraft={updateDraft}
                  />
                </section>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-sm">
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
                    <th className="py-2 px-2 font-medium w-20">Vote</th>
                    <th className="py-2 px-2 font-medium w-24">Phổ biến</th>
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
                        <td className="py-2 px-2 tabular-nums">{item.voteCount.toLocaleString()}</td>
                        <td className="py-2 px-2 tabular-nums">{item.popularityScore.toLocaleString()}</td>
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
