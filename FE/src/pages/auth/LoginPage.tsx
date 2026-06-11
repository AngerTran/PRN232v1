import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { login } from '../../services/authApi';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import inkflowLogo from '@/imports/image-10.png';
import workspacePhoto from '@/imports/image-4.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user) {
        if (user.role === 'admin') navigate('/admin/dashboard');
        else if (user.role === 'assistant') navigate('/assistant/dashboard');
        else if (user.role === 'editor') navigate('/editor/dashboard');
        else if (user.role === 'board') navigate('/board/dashboard');
        else navigate('/mangaka/dashboard');
      } else {
        setError('Email hoặc mật khẩu không đúng.');
      }
    } catch {
      setError('Cannot connect to backend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Photo panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src={workspacePhoto}
          alt="Editorial workspace with manga drawings and tablet"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Bottom text */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-medium mb-3">
            Editorial Workspace
          </p>
          <h2 className="text-3xl font-bold leading-snug max-w-xs">
            Nơi khởi nguồn những câu chuyện kiệt xuất.
          </h2>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <ImageWithFallback
              src={inkflowLogo}
              alt="MangaFlow"
              className="h-8 object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Chào mừng đến với MangaFlow
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Đăng nhập để tiếp tục hành trình sáng tác manga của bạn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@inkflow.jp"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors bg-gray-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <GoogleSignInButton label="Đăng nhập với Google" />

          <p className="text-center text-xs text-gray-400 mt-5">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-red-500 font-semibold hover:text-red-600">
              Bắt đầu tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
