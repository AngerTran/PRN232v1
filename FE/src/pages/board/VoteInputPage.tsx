import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, History, Save, Vote } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import {
  bulkSaveRankings,
  getRecentRankingInputs,
  getVoteInputContext,
  type RecentRankingInput,
  type VoteInputSeriesRow,
} from '../../services/boardApi';

type RowDraft = {
  rankPosition: string;
  voteCount: string;
  popularityScore: string;
  notes: string;
};

function rowKey(seriesId: string) {
  return seriesId;
}

function initDraft(row: VoteInputSeriesRow): RowDraft {
  return {
    rankPosition: row.existingRankPosition != null ? String(row.existingRankPosition) : '',
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

export default function VoteInputPage() {
  usePageMeta({ title: 'Nhập Vote Độc Giả' });
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [rows, setRows] = useState<VoteInputSeriesRow[]>([]);
  const [availableIssues, setAvailableIssues] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [recentInputs, setRecentInputs] = useState<RecentRankingInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await getRecentRankingInputs(30);
      setRecentInputs(items);
    } catch {
      setRecentInputs([]);
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

  const filledCount = useMemo(
    () => Object.values(drafts).filter(d => d.rankPosition.trim()).length,
    [drafts]
  );

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

  const submit = async () => {
    if (issueNumber == null) return;
    const entries = rows
      .map(row => {
        const draft = drafts[rowKey(row.seriesId)];
        if (!draft?.rankPosition.trim()) return null;
        return {
          seriesId: row.seriesId,
          rankPosition: Number(draft.rankPosition),
          voteCount: Number(draft.voteCount) || 0,
          popularityScore: Number(draft.popularityScore) || 0,
          notes: draft.notes.trim() || undefined,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e != null);

    if (entries.length === 0) {
      setError('Nhập ít nhất một thứ hạng trước khi lưu.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await bulkSaveRankings(issueNumber, entries);
      setSaved(true);
      await Promise.all([load(issueNumber), loadHistory()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ranking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nhập Dữ Liệu Vote Độc Giả</h1>
          <p className="text-muted-foreground mt-1 text-sm">Nhập theo kỳ phát hành — liên kết với lịch in khi có số kỳ trùng khớp</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Kỳ phát hành</label>
          <Select value={issueNumber != null ? String(issueNumber) : undefined} onValueChange={handleIssueChange}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Kỳ" /></SelectTrigger>
            <SelectContent>
              {issueOptions.map(n => (
                <SelectItem key={n} value={String(n)}>Kỳ {n}</SelectItem>
              ))}
              {issueNumber != null && !issueOptions.includes(issueNumber) && (
                <SelectItem value={String(issueNumber)}>Kỳ {issueNumber}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            className="w-20"
            value={issueNumber ?? ''}
            onChange={e => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1) setIssueNumber(n);
            }}
            onBlur={() => {
              if (issueNumber != null) load(issueNumber);
            }}
          />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={16} /> Đã lưu kỳ {issueNumber}.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Vote className="h-4 w-4" />
            Series đang xuất bản — Kỳ {issueNumber ?? '—'}
          </CardTitle>
          <Button type="button" onClick={submit} disabled={saving || loading || filledCount === 0}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Đang lưu...' : `Lưu ${filledCount} dòng`}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Đang tải...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chưa có series đang xuất bản.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Series</th>
                    <th className="py-2 px-2 font-medium w-24">Hạng</th>
                    <th className="py-2 px-2 font-medium w-28">Vote</th>
                    <th className="py-2 px-2 font-medium w-28">Phổ biến</th>
                    <th className="py-2 px-2 font-medium min-w-[160px]">Ghi chú</th>
                    <th className="py-2 pl-2 font-medium w-20 text-right">Lịch</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(row => {
                    const draft = drafts[rowKey(row.seriesId)] ?? initDraft(row);
                    return (
                      <tr key={row.seriesId}>
                        <td className="py-2 pr-3 font-medium">{row.title}</td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder="#"
                            value={draft.rankPosition}
                            onChange={e => updateDraft(row.seriesId, { rankPosition: e.target.value })}
                          />
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Lịch sử nhập gần đây
          </CardTitle>
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
                    <th className="py-2 pr-3 font-medium">Ngày nhập</th>
                    <th className="py-2 px-2 font-medium">Kỳ</th>
                    <th className="py-2 px-2 font-medium">Series</th>
                    <th className="py-2 px-2 font-medium w-16">Hạng</th>
                    <th className="py-2 px-2 font-medium w-20">Vote</th>
                    <th className="py-2 pl-2 font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInputs.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatInputDate(item.createdAt)}</td>
                      <td className="py-2 px-2 font-medium">Kỳ {item.issueNumber}</td>
                      <td className="py-2 px-2">{item.seriesTitle ?? item.seriesId.slice(0, 8)}</td>
                      <td className="py-2 px-2 font-semibold">#{item.rankPosition}</td>
                      <td className="py-2 px-2">{item.voteCount.toLocaleString()}</td>
                      <td className="py-2 pl-2 text-muted-foreground max-w-xs truncate" title={item.notes}>
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
