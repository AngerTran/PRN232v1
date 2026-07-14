import { useState, useEffect } from 'react';
import { CheckCircle, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getBoardMembers, type ProfileSummary } from '../../services/profilesApi';
import {
  assignGlobalBoardLead,
  clearGlobalBoardLead,
  getGlobalBoardLead,
  type GlobalBoardLead,
} from '../../services/boardApi';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
          value ? 'bg-red-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Cài đặt Admin' }); }, [setPageMeta]);

  // Account policy
  const [allowSelfRegister, setAllowSelfRegister] = useState(false);
  const [requireEmailVerify, setRequireEmailVerify] = useState(true);
  const [autoLockInactive, setAutoLockInactive] = useState(true);

  // Notification policy
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  // Registration policy
  const [manualApproval, setManualApproval] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(false);

  // Security policy
  const [require2FA, setRequire2FA] = useState(false);
  const [periodicPasswordReset, setPeriodicPasswordReset] = useState(true);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [boards, setBoards] = useState<ProfileSummary[]>([]);
  const [globalLead, setGlobalLead] = useState<GlobalBoardLead | null>(null);
  const [leadDraft, setLeadDraft] = useState('');
  const [leadLoading, setLeadLoading] = useState(true);
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [leadOk, setLeadOk] = useState('');

  useEffect(() => {
    let active = true;
    setLeadLoading(true);
    Promise.all([getBoardMembers().catch(() => []), getGlobalBoardLead().catch(() => null)])
      .then(([boardList, lead]) => {
        if (!active) return;
        setBoards(boardList);
        setGlobalLead(lead);
        setLeadDraft(lead?.boardMemberId ?? '');
      })
      .finally(() => {
        if (active) setLeadLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSaveLead = async () => {
    if (!leadDraft) {
      setLeadError('Chọn một board để gán Lead.');
      return;
    }
    setLeadSaving(true);
    setLeadError('');
    setLeadOk('');
    try {
      const lead = await assignGlobalBoardLead(leadDraft);
      setGlobalLead(lead);
      setLeadDraft(lead.boardMemberId);
      setLeadOk(`Đã gán ${lead.boardMemberName} làm Board Lead toàn cục.`);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Không thể gán Board Lead.');
    } finally {
      setLeadSaving(false);
    }
  };

  const handleClearLead = async () => {
    setLeadSaving(true);
    setLeadError('');
    setLeadOk('');
    try {
      await clearGlobalBoardLead();
      setGlobalLead(null);
      setLeadDraft('');
      setLeadOk('Đã hủy Board Lead. Không ai lên lịch cho đến khi gán lại.');
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Không thể hủy Board Lead.');
    } finally {
      setLeadSaving(false);
    }
  };

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 700);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cài đặt Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cấu hình chính sách và cài đặt hệ thống MangaFlow</p>
      </div>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown size={16} className="text-amber-600" />
            Lead hội đồng (toàn cục — chỉ 1 người)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Người này luôn là Lead trên mọi series (ưu tiên trong 3 board xét duyệt, lên lịch xuất bản).
            Đổi Lead = thay thế người hiện tại; không thể có 2 Lead cùng lúc.
          </p>
          {leadLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : (
            <>
              {globalLead ? (
                <p className="text-sm">
                  Hiện tại: <strong className="text-amber-800">{globalLead.boardMemberName}</strong>
                </p>
              ) : (
                <p className="text-sm text-amber-800">Chưa gán Board Lead.</p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                  value={leadDraft}
                  onChange={e => setLeadDraft(e.target.value)}
                  disabled={leadSaving || boards.length === 0}
                >
                  <option value="">Chọn board…</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={leadSaving || !leadDraft}
                  onClick={() => void handleSaveLead()}
                  className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                >
                  {leadSaving ? 'Đang lưu…' : globalLead ? 'Đổi Lead' : 'Gán Lead'}
                </button>
                {globalLead && (
                  <button
                    type="button"
                    disabled={leadSaving}
                    onClick={() => void handleClearLead()}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    Hủy Lead
                  </button>
                )}
              </div>
              {boards.length === 0 && (
                <p className="text-xs text-red-600">Không có board active để chọn.</p>
              )}
            </>
          )}
          {leadError && <p className="text-sm text-red-600">{leadError}</p>}
          {leadOk && <p className="text-sm text-green-700">{leadOk}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Account policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chính sách tài khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              label="Cho phép Mangaka tự đăng ký"
              description="Mangaka có thể tự đăng ký tài khoản mà không cần Admin tạo."
              value={allowSelfRegister}
              onChange={setAllowSelfRegister}
            />
            <ToggleRow
              label="Yêu cầu xác thực email"
              description="Tài khoản mới phải xác minh email trước khi đăng nhập."
              value={requireEmailVerify}
              onChange={setRequireEmailVerify}
            />
            <ToggleRow
              label="Tự khóa tài khoản không hoạt động"
              description="Tự động khóa tài khoản không đăng nhập trong 90 ngày."
              value={autoLockInactive}
              onChange={setAutoLockInactive}
            />
          </CardContent>
        </Card>

        {/* Notification policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chính sách thông báo</CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              label="Bật thông báo hệ thống"
              description="Hiển thị thông báo trong ứng dụng cho tất cả người dùng."
              value={systemNotifications}
              onChange={setSystemNotifications}
            />
            <ToggleRow
              label="Gửi email thông báo"
              description="Gửi email tự động khi có sự kiện quan trọng (tạo tài khoản, khóa tài khoản, v.v.)."
              value={emailNotifications}
              onChange={setEmailNotifications}
            />
          </CardContent>
        </Card>

        {/* Registration policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chính sách đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              label="Phê duyệt tài khoản mới thủ công"
              description="Admin phải duyệt thủ công trước khi tài khoản mới được kích hoạt."
              value={manualApproval}
              onChange={setManualApproval}
            />
            <ToggleRow
              label="Giới hạn số tài khoản mỗi ngày"
              description="Giới hạn tối đa 10 tài khoản mới được tạo mỗi ngày."
              value={dailyLimit}
              onChange={setDailyLimit}
            />
          </CardContent>
        </Card>

        {/* Security policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chính sách bảo mật</CardTitle>
          </CardHeader>
          <CardContent>
            <ToggleRow
              label="Bắt buộc xác thực 2 yếu tố cho Admin"
              description="Admin phải bật 2FA để đăng nhập vào hệ thống."
              value={require2FA}
              onChange={setRequire2FA}
            />
            <ToggleRow
              label="Đặt lại mật khẩu định kỳ"
              description="Người dùng phải đổi mật khẩu mỗi 90 ngày."
              value={periodicPasswordReset}
              onChange={setPeriodicPasswordReset}
            />
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm">
            <CheckCircle size={16} />
            <span>Đã lưu thành công!</span>
          </div>
        )}
      </div>
    </div>
  );
}
