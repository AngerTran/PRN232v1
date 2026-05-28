import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, UserCheck, Lock, BookOpen, UserPlus, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  getAdminStats,
  getAdminUsers,
  getSystemActivities,
  type RoleName,
  type UserStatus,
} from '../../data/adminMockData';

const STATUS_COLORS: Record<UserStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-500',
  Locked: 'bg-red-100 text-red-700',
  Pending: 'bg-orange-100 text-orange-700',
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

const STATUS_LABELS: Record<UserStatus, string> = {
  Active: 'Hoạt động',
  Inactive: 'Không hoạt động',
  Locked: 'Đã khóa',
  Pending: 'Chờ xử lý',
};

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function RoleBadge({ role }: { role: RoleName }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function formatDateTime(iso: string) {
  if (iso === '—') return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function AdminDashboardPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Admin Dashboard' }); }, []);
  const navigate = useNavigate();
  const stats = getAdminStats();
  const recentUsers = getAdminUsers().slice(-5).reverse();
  const recentActivities = getSystemActivities().slice(0, 5);

  const statCards = [
    { label: 'Tổng người dùng', value: stats.totalUsers, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Đang hoạt động', value: stats.activeUsers, icon: <UserCheck size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Bị khóa', value: stats.lockedUsers, icon: <Lock size={20} />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Series đang xuất bản', value: stats.publishingSeries, icon: <BookOpen size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Người dùng mới tháng này', value: stats.newUsersThisMonth, icon: <UserPlus size={20} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <LayoutDashboard size={24} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Xin chào, Quản trị viên</h1>
              <p className="text-sm text-gray-500 mt-0.5">Chào mừng đến với Admin Panel — MangaFlow System</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-5">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <span className={card.color}>{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Người dùng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 font-medium">Tên</th>
                  <th className="text-left py-2 font-medium">Vai trò</th>
                  <th className="text-left py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr
                    key={u.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5"><RoleBadge role={u.role} /></td>
                    <td className="py-2.5"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => navigate('/admin/users')}
              className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Xem tất cả →
            </button>
          </CardContent>
        </Card>

        {/* System Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoạt động hệ thống gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 font-medium">Người dùng</th>
                  <th className="text-left py-2 font-medium">Hành động</th>
                  <th className="text-left py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2.5">
                      <div>
                        <p className="font-medium text-gray-800">{a.userName}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(a.timestamp)}</p>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <p className="text-gray-700">{a.action}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{a.target}</p>
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVITY_STATUS_COLORS[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => navigate('/admin/activity')}
              className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Xem tất cả →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân bố vai trò</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(stats.roleDistribution) as [RoleName, number][]).map(([role, count]) => (
              <div key={role} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ROLE_COLORS[role].replace('text-', 'border-').replace('-700', '-200').replace('-600', '-200')} border`}>
                <RoleBadge role={role} />
                <span className="text-sm font-semibold text-gray-700">{count} người</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
