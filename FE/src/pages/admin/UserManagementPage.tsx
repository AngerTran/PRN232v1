import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Eye, Edit, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getAdminUsers, setAdminUserActive, type AdminUser, type RoleName, type UserStatus } from '../../services/adminApi';

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

function formatDate(iso: string) {
  if (iso === '—') return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN');
  } catch {
    return iso;
  }
}

export default function UserManagementPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Quản lý người dùng' }); }, []);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleName>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [localUsers, setLocalUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    void getAdminUsers().then(setLocalUsers);
  }, []);

  const filtered = localUsers.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  async function handleToggleLock(id: string) {
    const current = localUsers.find(user => user.id === id);
    if (!current) return;
    const updated = await setAdminUserActive(id, current.status === 'Inactive');
    setLocalUsers(prev => prev.map(user => user.id === id ? updated : user));
  }

  const roles: Array<{ value: 'all' | RoleName; label: string }> = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'mangaka', label: 'Mangaka' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'editor', label: 'Editor' },
    { value: 'board', label: 'Board' },
  ];

  const statuses: Array<{ value: 'all' | UserStatus; label: string }> = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'Active', label: 'Hoạt động' },
    { value: 'Inactive', label: 'Không hoạt động' },
    { value: 'Pending', label: 'Chờ xử lý' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý tất cả tài khoản trong hệ thống</p>
        </div>
        <button
          onClick={() => navigate('/admin/users/create')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus size={16} />
          Tạo người dùng
        </button>
      </div>

      <Card>
        <CardContent className="pt-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm tên hoặc email..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as 'all' | RoleName)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50"
            >
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | UserStatus)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Không tìm thấy người dùng nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-3 font-medium">Người dùng</th>
                    <th className="text-left py-3 font-medium">Email</th>
                    <th className="text-left py-3 font-medium">Vai trò</th>
                    <th className="text-left py-3 font-medium">Trạng thái</th>
                    <th className="text-left py-3 font-medium">Ngày tạo</th>
                    <th className="text-left py-3 font-medium">Đăng nhập lần cuối</th>
                    <th className="text-right py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          <span className="font-medium text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-500">{u.email}</td>
                      <td className="py-3"><RoleBadge role={u.role} /></td>
                      <td className="py-3"><StatusBadge status={u.status} /></td>
                      <td className="py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="py-3 text-gray-500">{formatDate(u.lastLogin)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            title="Xem chi tiết"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/users/${u.id}/edit`)}
                            title="Chỉnh sửa"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleLock(u.id)}
                            title={u.status === 'Inactive' ? 'Kích hoạt' : 'Vô hiệu hóa'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.status === 'Inactive'
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                          >
                            {u.status === 'Inactive' ? <Unlock size={15} /> : <Lock size={15} />}
                          </button>
                        </div>
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
