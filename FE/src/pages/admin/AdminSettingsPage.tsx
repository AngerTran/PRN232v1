import { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getBoardMembers, type ProfileSummary } from '../../services/profilesApi';
import {
  assignGlobalBoardLead,
  clearBoardLeadRole,
  listBoardLeads,
  type GlobalBoardLead,
} from '../../services/boardApi';

export default function AdminSettingsPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Cài đặt Admin' }); }, [setPageMeta]);

  const [boards, setBoards] = useState<ProfileSummary[]>([]);
  const [leads, setLeads] = useState<GlobalBoardLead[]>([]);
  const [leadLoading, setLeadLoading] = useState(true);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [leadError, setLeadError] = useState('');
  const [leadOk, setLeadOk] = useState('');

  const leadIdSet = new Set(leads.map(l => l.boardMemberId));

  const reloadLeads = async () => {
    const [boardList, leadList] = await Promise.all([
      getBoardMembers().catch(() => [] as ProfileSummary[]),
      listBoardLeads().catch(() => [] as GlobalBoardLead[]),
    ]);
    setBoards(boardList);
    setLeads(leadList);
  };

  useEffect(() => {
    let active = true;
    setLeadLoading(true);
    reloadLeads()
      .catch(() => {
        if (active) {
          setBoards([]);
          setLeads([]);
        }
      })
      .finally(() => {
        if (active) setLeadLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleLead = async (board: ProfileSummary, makeLead: boolean) => {
    setBusyLeadId(board.id);
    setLeadError('');
    setLeadOk('');
    try {
      if (makeLead) {
        await assignGlobalBoardLead(board.id);
        setLeadOk(`Đã gán chức vụ Lead cho ${board.name}.`);
      } else {
        await clearBoardLeadRole(board.id);
        setLeadOk(`Đã gỡ chức vụ Lead của ${board.name}.`);
      }
      await reloadLeads();
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Không thể cập nhật chức vụ Lead.');
    } finally {
      setBusyLeadId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cài đặt Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Quản lý Board Lead. Các chính sách hệ thống khác chưa có API lưu.
        </p>
      </div>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown size={16} className="text-amber-600" />
            Chức vụ Board Lead (có thể nhiều người)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Admin gán chức vụ Lead cho một hoặc nhiều account Board. Khi mangaka nộp series, hệ thống chọn{' '}
            <strong>3 board</strong>: <strong>1 Lead ít việc nhất</strong> + <strong>2 board thường ít việc nhất</strong>.
            Lead của series đó phụ trách lên lịch xuất bản sau khi duyệt.
          </p>
          {leadLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : boards.length === 0 ? (
            <p className="text-xs text-red-600">Không có board active để chọn.</p>
          ) : (
            <ul className="divide-y rounded-lg border border-amber-100 bg-white">
              {boards.map(board => {
                const isLead = leadIdSet.has(board.id);
                const busy = busyLeadId === board.id;
                return (
                  <li key={board.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {board.name}
                        {isLead && (
                          <span className="ml-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Lead
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{board.email}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || busyLeadId != null}
                      onClick={() => void handleToggleLead(board, !isLead)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${
                        isLead
                          ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                          : 'text-white bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {busy ? '…' : isLead ? 'Gỡ Lead' : 'Gán Lead'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {leads.length > 0 && (
            <p className="text-xs text-amber-900/80">
              Đang có <strong>{leads.length}</strong> Board Lead · {Math.max(0, boards.length - leads.length)} board thường
            </p>
          )}
          {leadError && <p className="text-sm text-red-600">{leadError}</p>}
          {leadOk && <p className="text-sm text-green-700">{leadOk}</p>}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Các khối “chính sách tài khoản / thông báo / đăng ký / bảo mật” trước đây chỉ lưu trên trình duyệt nên đã gỡ.
        Hiện chỉ cấu hình <strong>Board Lead</strong> là có hiệu lực trên server.
      </div>
    </div>
  );
}
