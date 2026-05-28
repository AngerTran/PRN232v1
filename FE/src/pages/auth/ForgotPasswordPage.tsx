import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PenTool, Mail, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 900);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <PenTool size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg">InkFlow</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-blue-600" />
            </div>
            <h2 className="font-bold text-xl mb-2">Kiểm tra email của bạn</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <strong>{email}</strong>.
            </p>
            <Link to="/login" className="text-primary font-semibold hover:underline text-sm flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Quay lại Đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1">Quên mật khẩu?</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Nhập email và chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="hiroshi.tanaka@inkflow.jp"
                  className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-colors"
                />
              </div>
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Gửi liên kết đặt lại
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Đã nhớ lại?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
