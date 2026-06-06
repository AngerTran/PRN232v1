import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { loginWithGoogleCode, loginWithGoogleHashTokens } from '../../services/authApi';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError = params.get('error') ?? hashParams.get('error');

      if (oauthError) {
        if (!cancelled) setError(decodeURIComponent(oauthError));
        return;
      }

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      try {
        if (accessToken && refreshToken) {
          await loginWithGoogleHashTokens(accessToken, refreshToken);
        } else {
          const code = params.get('code');
          if (!code) {
            if (!cancelled) setError('Không nhận được mã xác thực từ Google.');
            return;
          }
          await loginWithGoogleCode(code);
        }

        if (!cancelled) {
          navigate('/', { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
        }
      }
    }

    void handleCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={32} />
          <h1 className="text-lg font-semibold text-gray-900">Đăng nhập Google thất bại</h1>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
      <Loader2 className="animate-spin text-red-500" size={32} />
      <p className="text-sm text-gray-600">Đang hoàn tất đăng nhập Google…</p>
    </div>
  );
}
