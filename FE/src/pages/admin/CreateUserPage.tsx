import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { createAdminUser, type RoleName, type UserStatus } from '../../services/adminApi';

export default function CreateUserPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Tạo người dùng' }); }, []);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleName>('mangaka');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [tempPassword, setTempPassword] = useState('');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Họ tên không được để trống.';
    if (!email.trim()) e.email = 'Email không được để trống.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ.';
    if (!tempPassword.trim()) e.tempPassword = 'Mật khẩu tạm không được để trống.';
    else if (tempPassword.length < 6) e.tempPassword = 'Mật khẩu phải có ít nhất 6 ký tự.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await createAdminUser({
        email,
        password: tempPassword,
        fullName: name,
        role,
        bio: [phone, note].filter(Boolean).join('\n'),
        isActive: status === 'Active',
      });
      setLoading(false);
      setSuccess(true);
      setTimeout(() => navigate('/admin/users'), 1500);
    } catch (error) {
      setLoading(false);
      setErrors({ submit: error instanceof Error ? error.message : 'Không thể tạo người dùng.' });
    }
  }

  if (success) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Tạo người dùng thành công!</h2>
          <p className="text-sm text-gray-500 mt-1">Đang chuyển về danh sách...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tạo người dùng mới</h1>
          <p className="text-sm text-gray-500 mt-0.5">Điền thông tin để thêm tài khoản vào hệ thống</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Thông tin người dùng</CardTitle>
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
                  placeholder="Nguyễn Văn A"
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
                  placeholder="user@mangaflow.jp"
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
                  placeholder="+81-90-0000-0000"
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

              <div>
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
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Mật khẩu tạm thời <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50"
                />
                {errors.tempPassword && <p className="text-xs text-red-500 mt-1">{errors.tempPassword}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Ghi chú
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú về người dùng..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-gray-50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
