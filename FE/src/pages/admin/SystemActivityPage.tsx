import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getSystemActivities, type RoleName, type SystemActivity } from '../../services/adminApi';

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

const ACTIVITY_STATUS_COLORS: Record<SystemActivity['status'], string> = {
  Success: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
  Warning: 'bg-yellow-100 text-yellow-700',
};

function RoleBadge({ role }: { role: RoleName }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const ACTION_TYPES = ['All', 'Login', 'Logout', 'Create', 'Edit', 'Lock', 'Approve'];

export default function SystemActivityPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Hoạt động hệ thống' }); }, []);
  const [roleFilter, setRoleFilter] = useState<'all' | RoleName>('all');
  const [actionFilter, setActionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | SystemActivity['status']>('all');

  const [all, setAll] = useState<SystemActivity[]>([]);
  useEffect(() => {
    void getSystemActivities().then(setAll);
  }, []);

  const filtered = all.filter(a => {
    const matchRole = roleFilter === 'all' || a.userRole === roleFilter;
    const matchAction = actionFilter === 'All' || a.action === actionFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchRole && matchAction && matchStatus;
  });

  const roles: Array<{ value: 'all' | RoleName; label: string }> = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'admin', label: 'Admin' },
    { value: 'mangaka', label: 'Mangaka' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'editor', label: 'Editor' },
    { value: 'board', label: 'Board' },
  ];

  const statuses: Array<{ value: 'all' | SystemActivity['status']; label: string }> = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'Success', label: 'Success' },
    { value: 'Failed', label: 'Failed' },
    { value: 'Warning', label: 'Warning' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hoạt động hệ thống</h1>
        <p className="text-sm text-gray-500 mt-0.5">Nhật ký hoạt động và sự kiện trong MangaFlow</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
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
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50"
            >
              {ACTION_TYPES.map(a => (
                <option key={a} value={a}>{a === 'All' ? 'Tất cả hành động' : a}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | SystemActivity['status'])}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <span className="flex items-center text-xs text-gray-500 px-2">
              {filtered.length} kết quả
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Không có hoạt động nào khớp bộ lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-3 font-medium">Thời gian</th>
                    <th className="text-left py-3 font-medium">Người dùng</th>
                    <th className="text-left py-3 font-medium">Vai trò</th>
                    <th className="text-left py-3 font-medium">Hành động</th>
                    <th className="text-left py-3 font-medium">Mục tiêu</th>
                    <th className="text-left py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(a.timestamp)}</td>
                      <td className="py-3">
                        <span className="font-medium text-gray-800">{a.userName}</span>
                      </td>
                      <td className="py-3"><RoleBadge role={a.userRole} /></td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {a.action}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 max-w-[200px]">
                        <span className="truncate block">{a.target}</span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVITY_STATUS_COLORS[a.status]}`}>
                          {a.status}
                        </span>
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
