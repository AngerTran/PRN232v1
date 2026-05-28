import { useState } from 'react';
import { Bell, Shield, Palette, Globe, HelpCircle, ChevronRight } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const SECTIONS = [
  {
    icon: <Bell size={18} />,
    label: 'Thông báo',
    items: [
      { label: 'Trợ lý nộp nhiệm vụ', desc: 'Thông báo khi trợ lý nộp nhiệm vụ để xét duyệt', key: 'task_submit' },
      { label: 'Nhắc nhở thời hạn', desc: 'Nhắc nhở 3 ngày trước thời hạn nộp chương', key: 'deadline' },
      { label: 'Cảnh báo xếp hạng', desc: 'Thông báo khi xếp hạng series giảm đáng kể', key: 'ranking' },
      { label: 'Phản hồi ban biên tập', desc: 'Nhận thông báo về quyết định từ bài nộp', key: 'editorial' },
    ],
  },
  {
    icon: <Shield size={18} />,
    label: 'Quyền riêng tư & Bảo mật',
    items: [
      { label: 'Xác thực hai yếu tố', desc: 'Thêm lớp bảo mật cho tài khoản của bạn', key: '2fa' },
      { label: 'Hiển thị hồ sơ cho trợ lý', desc: 'Cho phép trợ lý xem hồ sơ đầy đủ của bạn', key: 'profile_visible' },
    ],
  },
];

const DISPLAY_OPTIONS = [
  { label: 'Ngôn ngữ hiển thị', value: 'Tiếng Việt / Tiếng Anh' },
  { label: 'Định dạng ngày', value: 'YYYY-MM-DD' },
  { label: 'Múi giờ', value: 'ICT (UTC+7)' },
  { label: 'Đơn vị xuất bản', value: 'Trang' },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    task_submit: true, deadline: true, ranking: true, editorial: false,
    '2fa': false, profile_visible: true,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => setToggles(t => ({ ...t, [key]: !t[key] }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cài đặt</h1>
        <Button variant="primary" size="sm" onClick={handleSave}>
          {saved ? '✓ Đã lưu' : 'Lưu thay đổi'}
        </Button>
      </div>

      {SECTIONS.map(section => (
        <Card key={section.label}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{section.icon}</span>
              <CardTitle>{section.label}</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-1">
            {section.items.map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${toggles[item.key] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${toggles[item.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-muted-foreground" />
            <CardTitle>Hiển thị & Khu vực</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-1">
          {DISPLAY_OPTIONS.map(opt => (
            <div key={opt.label} className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded-lg transition-colors">
              <span className="text-sm text-foreground">{opt.label}</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{opt.value}</span>
                <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-muted-foreground" />
            <CardTitle>Hỗ trợ</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-2">
          {['Tài liệu hỗ trợ', 'Liên hệ hỗ trợ', 'Báo lỗi', 'Điều khoản dịch vụ InkFlow'].map(label => (
            <button key={label} className="w-full flex items-center justify-between py-2.5 px-1 text-sm text-foreground hover:text-primary transition-colors text-left rounded-lg hover:bg-muted/30">
              {label}
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </Card>

      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-sm font-semibold text-red-700 mb-2">Vùng nguy hiểm</p>
        <p className="text-xs text-red-600 mb-3">Xóa tài khoản là vĩnh viễn và không thể hoàn tác. Tất cả series, chương và nhiệm vụ sẽ bị lưu trữ.</p>
        <Button variant="danger" size="sm">Xóa tài khoản</Button>
      </div>
    </div>
  );
}
