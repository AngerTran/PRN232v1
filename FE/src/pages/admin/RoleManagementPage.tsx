import { useEffect } from 'react';
import { Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getRoleDefinitions } from '../../data/adminMockData';

export default function RoleManagementPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Quản lý vai trò' }); }, []);
  const roles = getRoleDefinitions();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Quản lý vai trò</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tổng quan về các vai trò và quyền hạn trong hệ thống</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {roles.map(role => (
          <Card key={role.id} className="overflow-hidden">
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: role.color }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.label.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-sm">{role.label}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <Users size={11} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{role.userCount} người dùng</span>
                    </div>
                  </div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ color: role.color, backgroundColor: role.bg }}
                >
                  {role.userCount}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">{role.description}</p>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quyền hạn</p>
                <ul className="space-y-1.5">
                  {role.permissions.map((perm, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle size={12} className="shrink-0 mt-0.5" style={{ color: role.color }} />
                      <span className="text-gray-700">{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
