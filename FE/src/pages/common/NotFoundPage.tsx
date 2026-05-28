import { useNavigate } from 'react-router';
import Button from '../../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="relative inline-block mb-8">
          {/* Stylized 404 with manga panel aesthetic */}
          <svg viewBox="0 0 200 120" className="w-64 h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="120" fill="#F0EBE0" rx="4" />
            <rect x="4" y="4" width="88" height="112" fill="white" stroke="#1F1F1F" strokeWidth="2" rx="2" />
            <rect x="108" y="4" width="88" height="54" fill="white" stroke="#1F1F1F" strokeWidth="2" rx="2" />
            <rect x="108" y="66" width="88" height="50" fill="#F0EBE0" stroke="#1F1F1F" strokeWidth="2" rx="2" />
            <text x="20" y="72" fontSize="52" fontWeight="900" fill="#D72638" fontFamily="sans-serif">404</text>
            <text x="112" y="44" fontSize="14" fontWeight="700" fill="#1F1F1F" fontFamily="sans-serif">PAGE</text>
            <text x="112" y="30" fontSize="10" fill="#6B7280" fontFamily="sans-serif">CHAPTER</text>
            <text x="112" y="86" fontSize="9" fill="#6B7280" fontFamily="sans-serif">NOT FOUND</text>
            {/* Speed lines */}
            {[0, 18, 36, 54, 72].map(y => (
              <line key={y} x1="108" y1={66 + y} x2="196" y2={66 + y * 0.6} stroke="#D8D3C8" strokeWidth="0.8" />
            ))}
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Không tìm thấy trang</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Trang này không tồn tại trong bản thảo. Có thể đã bị di chuyển hoặc URL không chính xác.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>Quay lại</Button>
          <Button variant="primary" onClick={() => navigate('/mangaka/dashboard')}>Tổng quan</Button>
        </div>
      </div>
    </div>
  );
}
