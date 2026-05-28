import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Lock, Unlock, RotateCcw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  getAdminUserById,
  getSystemActivities,
  getRoleDefinitionById,
  type AdminUser,
  type RoleName,
  type UserStatus,
} from '../../data/adminMockData';

const STATUS_COLORS: Record<UserStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-500',
  Locked: 'bg-red-100 text-red-700',
  Pending: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  Active: 'Hoạt động',
  Inactive: 'Không hoạt động',
  Locked: 'Đã khóa',
  Pending: 'Chờ xử lý',
};

const ROLE_COLORS: Record<RoleName, string> = {
  admin: 'bg-red-100 text-red-700',
  mangaka: 'bg-purple-100 text-purple-700',
  assistant: 'bg-blue-100 text-blue-700',
  editor: 'bg-orange-100 text-orange-700',
  board: 'bg-violet-100 text-violet-700',
};

const ROLE_LABELS: Record<RoleName, string> = {
  admin: 'Admin',
  mangaka: 'Mangaka',
  assistant: 'Assistant',
  editor: 'Editor',
  board: 'Board',
};

const ACTIVITY_STATUS_COLORS = {
  Success: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
  Warning: 'bg-yellow-100 text-yellow-700',
};

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function RoleBadge({ role }: { role: RoleName }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function formatDateTime(iso: string) {
  if (iso === '—') return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  if (iso === '—') return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN');
  } catch {
    return iso;
  }
}

type TabId = 'overview' | 'activity' | 'permissions' | 'security';

export default function UserDetailPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Chi tiết người dùng' }); }, []);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [user, setUser] = useState<AdminUser | null>(
    userId ? (getAdminUserById(userId) ?? null) : null
  );
  const [passwordReset, setPasswordReset] = useState(false);

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-gray-500">Không tìm thấy người dùng.</p>
            <button
              onClick={() => navigate('/admin/users')}
              className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              ← Quay lại
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activities = getSystemActivities().filter(a => a.userId === user.id);
  const roleDef = getRoleDefinitionById(user.role);

  function handleToggleLock() {
    setUser(prev => prev
      ? { ...prev, status: prev.status === 'Locked' ? 'Active' : 'Locked' }
      : prev
    );
  }

  function handleResetPassword() {
    setPasswordReset(true);
    setTimeout(() => setPasswordReset(false), 3000);
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'activity', label: 'Hoạt động' },
    { id: 'permissions', label: 'Quyền hạn' },
    { id: 'security', label: 'Bảo mật' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Chi tiết người dùng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Thông tin chi tiết và hoạt động của tài khoản</p>
        </div>
        <button
          onClick={() => navigate(`/admin/users/${user.id}/edit`)}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Chỉnh sửa
        </button>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Thông tin cá nhân</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="font-medium text-gray-800">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Họ tên:</span>
                <span className="font-medium text-gray-800">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium text-gray-800">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Điện thoại:</span>
                  <span className="font-medium text-gray-800">{user.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày tạo:</span>
                <span className="font-medium text-gray-800">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Đăng nhập cuối:</span>
                <span className="font-medium text-gray-800">{formatDate(user.lastLogin)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Ghi chú & Vai trò</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Vai trò:</p>
                <RoleBadge role={user.role} />
              </div>
              <div>
                <p className="text-gray-500 mb-1">Trạng thái:</p>
                <StatusBadge status={user.status} />
              </div>
              {user.note && (
                <div>
                  <p className="text-gray-500 mb-1">Ghi chú:</p>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-xs">{user.note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Lịch sử hoạt động</CardTitle></CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Chưa có hoạt động nào.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 font-medium">Thời gian</th>
                    <th className="text-left py-2 font-medium">Hành động</th>
                    <th className="text-left py-2 font-medium">Mục tiêu</th>
                    <th className="text-left py-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(a => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2.5 text-gray-500 text-xs">{formatDateTime(a.timestamp)}</td>
                      <td className="py-2.5 text-gray-800">{a.action}</td>
                      <td className="py-2.5 text-gray-500">{a.target}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVITY_STATUS_COLORS[a.status]}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'permissions' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Quyền hạn theo vai trò</CardTitle></CardHeader>
          <CardContent>
            {roleDef ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">{roleDef.description}</p>
                <ul className="space-y-2">
                  {roleDef.permissions.map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      <span className="text-gray-700">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Không tìm thấy thông tin quyền hạn.</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Bảo mật tài khoản</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {user.status === 'Locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user.status === 'Locked'
                    ? 'Tài khoản đang bị khóa. Nhấn để mở khóa.'
                    : 'Tạm thời vô hiệu hóa quyền đăng nhập của người dùng này.'}
                </p>
              </div>
              <button
                onClick={handleToggleLock}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  user.status === 'Locked'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {user.status === 'Locked' ? <Unlock size={14} /> : <Lock size={14} />}
                {user.status === 'Locked' ? 'Mở khóa' : 'Khóa tài khoản'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">Đặt lại mật khẩu</p>
                <p className="text-xs text-gray-500 mt-0.5">Gửi email đặt lại mật khẩu đến người dùng.</p>
              </div>
              <button
                onClick={handleResetPassword}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <RotateCcw size={14} />
                {passwordReset ? 'Đã gửi email!' : 'Đặt lại mật khẩu'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
