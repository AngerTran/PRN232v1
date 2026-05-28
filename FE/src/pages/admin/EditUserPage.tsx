import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getAdminUserById, type RoleName, type UserStatus } from '../../data/adminMockData';

export default function EditUserPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Chỉnh sửa người dùng' }); }, []);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const original = userId ? getAdminUserById(userId) : undefined;

  const [name, setName] = useState(original?.name ?? '');
  const [email, setEmail] = useState(original?.email ?? '');
  const [phone, setPhone] = useState(original?.phone ?? '');
  const [role, setRole] = useState<RoleName>(original?.role ?? 'mangaka');
  const [status, setStatus] = useState<UserStatus>(original?.status ?? 'Active');
  const [note, setNote] = useState(original?.note ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!original) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-gray-500">Không tìm thấy người dùng.</p>
            <button
              onClick={() => navigate('/admin/users')}
              className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              ← Quay lại danh sách
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Họ tên không được để trống.';
    if (!email.trim()) e.email = 'Email không được để trống.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ.';
    return e;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(`/admin/users/${userId}`);
    }, 600);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/admin/users/${userId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chỉnh sửa người dùng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cập nhật thông tin tài khoản</p>
        </div>
      </div>

      {/* User mini-header */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <img src={original.avatar} alt={original.name} className="w-10 h-10 rounded-full object-cover" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{original.name}</p>
          <p className="text-xs text-gray-500">{original.email}</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Thông tin chỉnh sửa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Số điện thoại
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Vai trò
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as RoleName)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50"
                >
                  <option value="mangaka">Mangaka</option>
                  <option value="assistant">Assistant</option>
                  <option value="editor">Editor</option>
                  <option value="board">Board</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as UserStatus)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Không hoạt động</option>
                  <option value="Pending">Chờ xử lý</option>
                  <option value="Locked">Đã khóa</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Ghi chú
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/admin/users/${userId}`)}
                className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
