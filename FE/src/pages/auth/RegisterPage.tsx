import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Check } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import inkflowLogo from '@/imports/image-10.png';
import workspacePhoto from '@/imports/image-4.png';
import { registerWithApi } from '../../services/authApi';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerWithApi({
        email: form.email,
        password: form.password,
        fullName: form.name,
      });
      setSuccess(true);
      // Nếu BE trả token luôn thì vào dashboard, ngược lại cần xác nhận email → về login.
      setTimeout(() => navigate(result.user ? '/' : '/login'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-green-600" />
          </div>
          <h2 className="font-bold text-xl mb-2 text-gray-900">Tài khoản đã được tạo!</h2>
          <p className="text-gray-400 text-sm">Đang chuyển đến trang đăng nhập…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Photo panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src={workspacePhoto}
          alt="Editorial workspace with manga drawings and tablet"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-medium mb-3">
            Editorial Workspace
          </p>
          <h2 className="text-3xl font-bold leading-snug max-w-xs">
            Hành trình sáng tạo câu chuyện kiệt xuất bắt đầu từ đây.
          </h2>
          <p className="text-sm text-white/60 mt-3 max-w-xs leading-relaxed">
            Kết nối với đội ngũ chuyên nghiệp, quản lý dự án và xây dựng thương hiệu manga của bạn.
          </p>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-4">
          {/* Logo */}
          <div className="mb-7">
            <ImageWithFallback
              src={inkflowLogo}
              alt="MangaFlow"
              className="h-8 object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Bắt đầu với MangaFlow
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            Tạo tài khoản để tham gia cộng đồng manga chuyên nghiệp.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Họ và tên
              </label>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                required
                placeholder="Tanaka Hiroshi"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                placeholder="you@inkflow.jp"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={update('confirm')}
                required
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors bg-gray-50"
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    agreed ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white'
                  }`}
                >
                  {agreed && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-xs text-gray-500 leading-relaxed">
                Tôi đồng ý với{' '}
                <span className="text-red-500 font-medium cursor-pointer hover:underline">
                  Điều khoản dịch vụ
                </span>{' '}
                và{' '}
                <span className="text-red-500 font-medium cursor-pointer hover:underline">
                  Chính sách bảo mật
                </span>{' '}
                của MangaFlow
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <GoogleSignInButton label="Đăng ký với Google" />

          <p className="text-center text-xs text-gray-400 mt-5">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-red-500 font-semibold hover:text-red-600">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
