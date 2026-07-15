import { useEffect, useState } from 'react';
import { Search, Trash2, BookOpen, Crown } from 'lucide-react';
import { Card, CardContent } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { deleteSeries, getVisibleSeriesLight } from '../../services/seriesApi';
import { listBoardLeads, type GlobalBoardLead } from '../../services/boardApi';
import { getBoardMembers } from '../../services/profilesApi';
import type { Series, SeriesStatus } from '../../types/domain';
import { SERIES_STATUS_FILTER_OPTIONS, SERIES_STATUS_LABELS } from '../../utils/statusLabels';

const STATUS_PILL: Partial<Record<SeriesStatus, string>> = {
  Draft: 'bg-slate-100 text-slate-700',
  Submitted: 'bg-amber-100 text-amber-800',
  Approved: 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-teal-100 text-teal-700',
  Published: 'bg-indigo-100 text-indigo-700',
  Cancelled: 'bg-red-100 text-red-700',
  'Revision Required': 'bg-orange-100 text-orange-700',
  'At Risk': 'bg-rose-100 text-rose-700',
};

export default function AdminSeriesPage() {
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();
  useEffect(() => {
    setPageMeta({ title: 'Quản lý Series' });
  }, [setPageMeta]);

  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SeriesStatus>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeBoardCount, setActiveBoardCount] = useState<number | null>(null);
  const [boardLeads, setBoardLeads] = useState<GlobalBoardLead[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [list, boards, leads] = await Promise.all([
        getVisibleSeriesLight(),
        getBoardMembers().catch(() => []),
        listBoardLeads().catch(() => []),
      ]);
      setSeries(list);
      setActiveBoardCount(boards.length);
      setBoardLeads(leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách series.');
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = series.filter(item => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.mangakaName ?? '').toLowerCase().includes(q) ||
      (item.genre ?? '').toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (item: Series) => {
    const ok = await confirm({
      title: 'Xóa series?',
      message: `Xóa vĩnh viễn "${item.title}" và toàn bộ dữ liệu liên quan?`,
      confirmText: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(item.id);
    setError('');
    try {
      await deleteSeries(item.id);
      setSeries(prev => prev.filter(s => s.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa series.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Quản lý Series</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Quản lý / xóa series. Chức vụ Board Lead gán tại Cài đặt Admin (có thể nhiều Lead).
        </p>
      </div>

      {boardLeads.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 inline-flex items-start gap-2">
          <Crown size={16} className="mt-0.5 shrink-0" />
          <span>
            Board Lead ({boardLeads.length}):{' '}
            <strong>{boardLeads.map(l => l.boardMemberName).join(', ')}</strong>
            {activeBoardCount != null && (
              <> · {Math.max(0, activeBoardCount - boardLeads.length)} board thường</>
            )}
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Chưa có Board Lead — vào <strong>Cài đặt Admin</strong> để gán chức vụ Lead cho ít nhất 1 board.
        </div>
      )}

      {activeBoardCount != null && activeBoardCount < 3 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hệ thống đang có <strong>{activeBoardCount}</strong> board active (khuyến nghị ≥ 3 để đủ hội đồng mỗi series).
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên series, mangaka, thể loại, id…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | SeriesStatus)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 min-w-[180px]"
            >
              <option value="all">Tất cả trạng thái</option>
              {SERIES_STATUS_FILTER_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {SERIES_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            {loading ? 'Đang tải…' : `${filtered.length} / ${series.length} series`}
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Đang tải danh sách…</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-2 text-gray-300" size={28} />
              Không có series khớp bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="pb-3 pr-3 font-semibold">Series</th>
                    <th className="pb-3 pr-3 font-semibold">Mangaka</th>
                    <th className="pb-3 pr-3 font-semibold">Trạng thái</th>
                    <th className="pb-3 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/80 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">
                          {item.id}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-gray-700">{item.mangakaName || '—'}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_PILL[item.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {SERIES_STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => void handleDelete(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          {deletingId === item.id ? 'Đang xóa…' : 'Xóa'}
                        </button>
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
