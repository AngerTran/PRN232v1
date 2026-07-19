import { Bell, Shield, Globe, HelpCircle, ChevronRight, Info } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useEffect } from 'react';

const SECTIONS = [
  {
    icon: <Bell size={18} />,
    label: 'Thông báo',
    items: [
      { label: 'Trợ lý nộp nhiệm vụ', desc: 'Thông báo khi trợ lý nộp nhiệm vụ để xét duyệt' },
      { label: 'Nhắc nhở thời hạn', desc: 'Nhắc nhở 3 ngày trước thời hạn nộp chương' },
      { label: 'Cảnh báo xếp hạng', desc: 'Thông báo khi xếp hạng series giảm đáng kể' },
      { label: 'Phản hồi ban biên tập', desc: 'Nhận thông báo về quyết định từ bài nộp' },
    ],
  },
  {
    icon: <Shield size={18} />,
    label: 'Quyền riêng tư & Bảo mật',
    items: [
      { label: 'Xác thực hai yếu tố', desc: 'Thêm lớp bảo mật cho tài khoản của bạn' },
      { label: 'Hiển thị hồ sơ cho trợ lý', desc: 'Cho phép trợ lý xem hồ sơ đầy đủ của bạn' },
    ],
  },
];

const DISPLAY_OPTIONS = [
  { label: 'Ngôn ngữ hiển thị', value: 'Tiếng Việt' },
  { label: 'Định dạng ngày', value: 'DD/MM/YYYY' },
  { label: 'Múi giờ', value: 'ICT (UTC+7)' },
];

export default function SettingsPage() {
  const { setPageMeta } = usePageMeta();
  useEffect(() => { setPageMeta({ title: 'Cài đặt' }); }, [setPageMeta]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xem trước tùy chọn. Thay đổi hồ sơ tại trang Hồ sơ.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          Các tùy chọn bên dưới <strong>chưa đồng bộ lên server</strong>.
          Thông báo thực tế đang theo quy tắc hệ thống; chỉnh tên/bio/avatar ở <strong>Hồ sơ</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {SECTIONS.map(section => (
          <Card key={section.label}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{section.icon}</span>
                <CardTitle>{section.label}</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-1 opacity-70">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sắp có</span>
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
              <div key={opt.label} className="flex items-center justify-between py-3 border-b border-border last:border-0 px-1">
                <span className="text-sm text-foreground">{opt.label}</span>
                <span className="text-sm text-muted-foreground">{opt.value}</span>
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
          <div className="space-y-2 opacity-70">
            {['Tài liệu hỗ trợ', 'Liên hệ hỗ trợ', 'Báo lỗi'].map(label => (
              <div key={label} className="flex items-center justify-between py-2.5 px-1 text-sm text-foreground">
                {label}
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
