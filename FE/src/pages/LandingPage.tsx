import { useState } from 'react';
import { useNavigate } from 'react-router';
import mangaLogo from '../imports/image-10.png';
import {
  BookOpen, FileText, ClipboardList, CheckCircle, BarChart2, Users,
  ArrowRight, PenTool, Layers, Target, TrendingUp, Shield, Star,
  ChevronRight, Menu, X, Zap, Clock, MessageSquare, AlertTriangle,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D8D3C8] bg-[#FFFDF8] text-xs font-semibold text-[#D72638] tracking-wide">
      {children}
    </span>
  );
}

function PrimaryBtn({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D72638] hover:bg-[#b71e2f] text-white font-semibold text-sm transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#D8D3C8] bg-white hover:bg-[#F7F3EA] text-[#1F1F1F] font-semibold text-sm transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FFFDF8] border border-[#D8D3C8] rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────

function Navbar({ onLogin, onStart }: { onLogin: () => void; onStart: () => void }) {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#F7F3EA]/95 backdrop-blur border-b border-[#D8D3C8]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src={mangaLogo} alt="MangaFlow" className="w-9 h-9 object-contain" />
          <span className="font-bold text-[#1F1F1F] tracking-tight">MangaFlow</span>
        </div>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: 'Tính năng', id: 'features' },
            { label: 'Quy trình', id: 'workflow' },
            { label: 'Vai trò', id: 'roles' },
            { label: 'Lợi ích', id: 'benefits' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-sm text-[#6B7280] hover:text-[#1F1F1F] font-medium transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          <SecondaryBtn onClick={onLogin}>Đăng nhập</SecondaryBtn>
          <PrimaryBtn onClick={onStart}>Bắt đầu</PrimaryBtn>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 rounded-lg hover:bg-[#EDE9DF]" onClick={() => setOpen(o => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[#D8D3C8] bg-[#F7F3EA] px-6 py-4 space-y-3">
          {[
            { label: 'Tính năng', id: 'features' },
            { label: 'Quy trình', id: 'workflow' },
            { label: 'Vai trò', id: 'roles' },
            { label: 'Lợi ích', id: 'benefits' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="block w-full text-left text-sm text-[#6B7280] hover:text-[#1F1F1F] font-medium py-1"
            >
              {item.label}
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <SecondaryBtn onClick={onLogin} className="flex-1 justify-center">Đăng nhập</SecondaryBtn>
            <PrimaryBtn onClick={onStart} className="flex-1 justify-center">Bắt đầu</PrimaryBtn>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero mock dashboard ────────────────────────────────────────────────────

function HeroDashboardMock() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      {/* Main dashboard card */}
      <Card className="shadow-xl p-4 space-y-3">
        {/* Topbar mock */}
        <div className="flex items-center justify-between pb-2 border-b border-[#D8D3C8]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#D72638]" />
            <div className="h-2.5 w-20 bg-[#EDE9DF] rounded" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-14 bg-[#EDE9DF] rounded" />
            <div className="w-5 h-5 rounded-full bg-[#EDE9DF]" />
            <div className="w-5 h-5 rounded-full bg-[#D8D3C8]" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Series', value: '3', color: '#4B3F72' },
            { label: 'Chapters', value: '12', color: '#D72638' },
            { label: 'Tasks', value: '28', color: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="bg-[#F7F3EA] rounded-xl p-2.5 text-center">
              <p className="font-bold text-sm" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Manga page preview */}
        <div className="bg-[#2B2B2B] rounded-xl p-3 relative overflow-hidden">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Voidwalker Ch.12 — Page 3</p>
          {/* Manga panel grid mock */}
          <div className="grid grid-cols-3 gap-1 h-24">
            <div className="col-span-2 row-span-2 border border-white/20 rounded flex items-center justify-center">
              <div className="space-y-1 w-full px-2">
                <div className="h-1 bg-white/20 rounded w-3/4" />
                <div className="h-1 bg-white/20 rounded w-1/2" />
                <div className="h-1 bg-white/20 rounded w-2/3" />
              </div>
            </div>
            <div className="border border-white/20 rounded flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border border-white/30" />
            </div>
            <div className="border border-white/20 rounded flex items-center justify-center">
              <div className="w-3 h-3 border border-white/30 rounded-sm" />
            </div>
          </div>
          {/* Annotation badge */}
          <div className="absolute top-2 right-2 bg-[#D72638] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            3 ghi chú
          </div>
          {/* Selection region mock */}
          <div className="absolute bottom-6 left-4 w-16 h-12 border-2 border-[#F2C94C] rounded opacity-70" />
        </div>

        {/* Task cards */}
        <div className="space-y-1.5">
          {[
            { title: 'Tô nền trang 3', status: 'In Progress', color: '#4B3F72' },
            { title: 'Screentone vùng B', status: 'Pending', color: '#9CA3AF' },
          ].map(t => (
            <div key={t.title} className="flex items-center justify-between bg-[#F7F3EA] rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                <span className="text-[11px] font-medium text-[#1F1F1F]">{t.title}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: t.color + '20', color: t.color }}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Floating annotation badge */}
      <div className="absolute -top-3 -right-4 bg-white border border-[#D8D3C8] shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 rotate-2">
        <MessageSquare size={13} className="text-[#D72638]" />
        <span className="text-[11px] font-semibold text-[#1F1F1F]">Panel Layout — Cần chỉnh</span>
      </div>

      {/* Floating deadline badge */}
      <div className="absolute -bottom-3 -left-4 bg-white border border-[#D8D3C8] shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 -rotate-1">
        <Clock size={13} className="text-[#F97316]" />
        <span className="text-[11px] font-semibold text-[#1F1F1F]">Deadline: 3 ngày</span>
      </div>
    </div>
  );
}

// ── Section: Problem ───────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: <MessageSquare size={20} className="text-[#D72638]" />,
    title: 'Trao đổi rời rạc qua nhiều ứng dụng',
    desc: 'Tác giả, trợ lý và biên tập viên phải dùng nhiều công cụ khác nhau, dễ thất lạc thông tin.',
  },
  {
    icon: <Layers size={20} className="text-[#D72638]" />,
    title: 'Khó theo dõi tiến độ từng trang',
    desc: 'Việc kiểm soát trạng thái từng trang, từng vùng vẽ và từng task trở nên phức tạp.',
  },
  {
    icon: <AlertTriangle size={20} className="text-[#D72638]" />,
    title: 'Biên tập viên thiếu góc nhìn tổng quan',
    desc: 'Editor khó biết studio đang làm đến đâu và có kịp deadline hay không.',
  },
  {
    icon: <BarChart2 size={20} className="text-[#D72638]" />,
    title: 'Hội đồng thiếu dữ liệu ra quyết định',
    desc: 'Việc duyệt, xuất bản hoặc hủy series cần dựa trên dữ liệu bình chọn và ranking rõ ràng.',
  },
];

// ── Section: Features ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: <BookOpen size={20} />, title: 'Quản lý hồ sơ series', desc: 'Mangaka tạo hồ sơ series, nộp bản thảo và theo dõi trạng thái xét duyệt.' },
  { icon: <FileText size={20} />, title: 'Quản lý chapter và trang truyện', desc: 'Theo dõi tiến độ hoàn thiện từng chapter, từng page trong quá trình sản xuất.' },
  { icon: <Target size={20} />, title: 'Giao việc theo vùng trên trang', desc: 'Chọn trực tiếp một vùng trên trang truyện và giao nhiệm vụ cho trợ lý.' },
  { icon: <CheckCircle size={20} />, title: 'Duyệt kết quả của trợ lý', desc: 'Mangaka kiểm tra, phê duyệt hoặc yêu cầu chỉnh sửa kết quả được gửi lại.' },
  { icon: <PenTool size={20} />, title: 'Biên tập và đánh dấu trực tiếp', desc: 'Tantou Editor có thể ghi chú, đánh dấu lỗi hoặc yêu cầu chỉnh sửa trên trang.' },
  { icon: <TrendingUp size={20} />, title: 'Ranking và quyết định xuất bản', desc: 'Hội đồng nhập dữ liệu bình chọn, xem bảng xếp hạng và đưa ra quyết định xuất bản.' },
];

// ── Section: Workflow steps ─────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { step: '01', title: 'Mangaka tạo hồ sơ series' },
  { step: '02', title: 'Nộp bản thảo sơ bộ' },
  { step: '03', title: 'Hội đồng xét duyệt và bỏ phiếu' },
  { step: '04', title: 'Mangaka giao việc cho trợ lý theo từng vùng trên trang' },
  { step: '05', title: 'Editor đánh dấu và yêu cầu chỉnh sửa' },
  { step: '06', title: 'Hội đồng theo dõi ranking và quyết định xuất bản' },
];

// ── Section: Roles ─────────────────────────────────────────────────────────

const ROLES = [
  {
    icon: <PenTool size={24} />,
    title: 'Mangaka',
    color: '#D72638',
    bg: '#FEF2F2',
    desc: 'Tạo series, nộp bản thảo, giao việc cho trợ lý và duyệt kết quả.',
    features: ['Tạo & quản lý series', 'Giao task theo vùng trang', 'Duyệt kết quả trợ lý', 'Theo dõi xếp hạng'],
  },
  {
    icon: <ClipboardList size={24} />,
    title: 'Assistant',
    color: '#4B3F72',
    bg: '#F3F0FF',
    desc: 'Nhận task, tải tài nguyên, hoàn thành phần việc và gửi kết quả.',
    features: ['Nhận & xem task', 'Tải tài nguyên', 'Gửi kết quả', 'Theo dõi thu nhập'],
  },
  {
    icon: <Shield size={24} />,
    title: 'Tantou Editor',
    color: '#2563EB',
    bg: '#EFF6FF',
    desc: 'Review bản thảo, đánh dấu lỗi, theo dõi tiến độ và hỗ trợ bảo vệ series.',
    features: ['Review & annotation', 'Theo dõi tiến độ studio', 'Quản lý deadline', 'Chuẩn bị bảo vệ series'],
  },
  {
    icon: <Star size={24} />,
    title: 'Editorial Board',
    color: '#7C3AED',
    bg: '#F5F3FF',
    desc: 'Duyệt series mới, nhập dữ liệu bình chọn, xem ranking và quyết định xuất bản.',
    features: ['Duyệt series mới', 'Nhập vote độc giả', 'Xem bảng xếp hạng', 'Ra quyết định xuất bản'],
  },
];

// ── Section: Benefits ──────────────────────────────────────────────────────

const BENEFITS = [
  { icon: <Users size={20} />, title: 'Trách nhiệm rõ ràng', desc: 'Mỗi task đều có người phụ trách, deadline và trạng thái cụ thể.' },
  { icon: <CheckCircle size={20} />, title: 'Giảm sai sót khi trao đổi', desc: 'Thông tin công việc, phản hồi và bản thảo được lưu tập trung trong hệ thống.' },
  { icon: <Clock size={20} />, title: 'Theo dõi deadline hiệu quả', desc: 'Studio, editor và hội đồng có thể nắm tiến độ theo thời gian thực.' },
  { icon: <BarChart2 size={20} />, title: 'Ra quyết định dựa trên dữ liệu', desc: 'Ranking, vote và lịch sử xuất bản giúp hội đồng đưa ra quyết định hợp lý.' },
];

// ── Task assignment mock ───────────────────────────────────────────────────

function TaskAssignmentMock() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Manga page mock */}
      <div className="flex-1 bg-[#2B2B2B] rounded-2xl p-5 relative min-h-[280px]">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Shadow Blade — Ch.8 Page 5</p>
        <div className="grid grid-cols-2 gap-2 h-48">
          <div className="border border-white/20 rounded-lg col-span-2 flex items-end p-2">
            <div className="space-y-1 w-full">
              <div className="h-1 bg-white/20 rounded w-full" />
              <div className="h-1 bg-white/20 rounded w-4/5" />
            </div>
          </div>
          <div className="border border-white/20 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-white/30" />
          </div>
          <div className="border border-white/20 rounded-lg flex items-center justify-center">
            <div className="space-y-1">
              <div className="h-1 bg-white/20 rounded w-12" />
              <div className="h-1 bg-white/20 rounded w-8" />
            </div>
          </div>
        </div>
        {/* Selected region */}
        <div className="absolute top-16 left-8 w-32 h-20 border-2 border-[#F2C94C] rounded-lg">
          <div className="absolute -top-5 left-0 bg-[#F2C94C] text-[#1F1F1F] text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            Vùng được chọn
          </div>
        </div>
      </div>

      {/* Task panel mock */}
      <Card className="w-full lg:w-64 p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#D8D3C8]">
          <div className="w-5 h-5 rounded bg-[#D72638]/10 flex items-center justify-center">
            <ClipboardList size={12} className="text-[#D72638]" />
          </div>
          <p className="font-semibold text-sm text-[#1F1F1F]">Giao task mới</p>
        </div>
        {[
          { label: 'Loại công việc', value: 'Screentone', color: '#4B3F72' },
          { label: 'Trợ lý', value: 'Yamamoto Keiko', color: null },
          { label: 'Deadline', value: '28/05/2026', color: '#F97316' },
          { label: 'Trạng thái', value: 'In Progress', color: '#4B3F72' },
        ].map(row => (
          <div key={row.label}>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wide font-semibold mb-0.5">{row.label}</p>
            <p className="text-xs font-semibold" style={{ color: row.color || '#1F1F1F' }}>{row.value}</p>
          </div>
        ))}
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wide font-semibold mb-0.5">Mô tả</p>
          <p className="text-xs text-[#6B7280] leading-relaxed">Tô screentone vùng bầu trời và nền sau nhân vật chính.</p>
        </div>
        <button className="w-full py-2 rounded-xl bg-[#D72638] text-white text-xs font-bold hover:bg-[#b71e2f] transition-colors">
          Xác nhận giao việc
        </button>
      </Card>
    </div>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#1F1F1F]" style={{ fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif" }}>
      <Navbar onLogin={() => navigate('/login')} onStart={() => navigate('/register')} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge>
              <Zap size={11} />
              Nền tảng quản lý quy trình Manga
            </Badge>
            <h1 className="mt-5 mb-4 leading-tight" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.75rem)', fontWeight: 700 }}>
              Quản lý quá trình sáng tác Manga từ bản thảo đến xuất bản
            </h1>
            <p className="text-[#6B7280] leading-relaxed mb-8 max-w-lg">
              MangaFlow giúp Mangaka, trợ lý, biên tập viên và hội đồng biên tập phối hợp trong một không gian làm việc chuyên nghiệp, rõ ràng và hiệu quả.
            </p>
            <div className="flex flex-wrap gap-3">
              <PrimaryBtn onClick={() => navigate('/register')}>
                Bắt đầu ngay <ArrowRight size={15} />
              </PrimaryBtn>
              <SecondaryBtn onClick={() => navigate('/login')}>
                Đăng nhập vào hệ thống
              </SecondaryBtn>
            </div>
            {/* Mini stats */}
            <div className="flex gap-6 mt-10 pt-8 border-t border-[#D8D3C8]">
              {[
                { value: '4', label: 'Vai trò tích hợp' },
                { value: '10+', label: 'Tính năng chính' },
                { value: '100%', label: 'Không cần backend' },
              ].map(s => (
                <div key={s.label}>
                  <p className="font-bold text-xl text-[#D72638]">{s.value}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 pb-8">
            <HeroDashboardMock />
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────── */}
      <section className="bg-[#FFFDF8] border-y border-[#D8D3C8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>Vấn đề</Badge>
            <h2 className="mt-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
              Vấn đề trong quy trình sản xuất Manga
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROBLEMS.map(p => (
              <Card key={p.title} className="p-5 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center mb-4">
                  {p.icon}
                </div>
                <h3 className="font-semibold text-sm mb-2 leading-snug">{p.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{p.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>Tính năng</Badge>
            <h2 className="mt-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
              Tính năng chính của hệ thống
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <Card key={f.title} className="p-5 hover:shadow-md transition-shadow group">
                <div className="w-9 h-9 rounded-xl bg-[#F7F3EA] flex items-center justify-center mb-4 text-[#D72638] group-hover:bg-[#D72638] group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────── */}
      <section id="workflow" className="bg-[#FFFDF8] border-y border-[#D8D3C8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge>Quy trình</Badge>
            <h2 className="mt-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
              Quy trình từ ý tưởng đến xuất bản
            </h2>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-8 right-8 h-px bg-[#D8D3C8]" />
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
              {WORKFLOW_STEPS.map((s, i) => (
                <div key={s.step} className="relative flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm mb-3 z-10 border-2 ${i === 0 || i === 5 ? 'bg-[#D72638] text-white border-[#D72638]' : 'bg-[#FFFDF8] text-[#D72638] border-[#D8D3C8]'}`}>
                    {s.step}
                  </div>
                  <p className="text-xs font-semibold text-[#1F1F1F] leading-snug">{s.title}</p>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight size={14} className="hidden lg:block absolute -right-2.5 top-5 text-[#D8D3C8]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ────────────────────────────────────────────── */}
      <section id="roles" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>Vai trò</Badge>
            <h2 className="mt-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
              Phù hợp cho từng vai trò trong quy trình Manga
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map(r => (
              <Card key={r.title} className="p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: r.bg, color: r.color }}>
                  {r.icon}
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: r.color }}>{r.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{r.desc}</p>
                <ul className="space-y-1.5">
                  {r.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-[#1F1F1F]">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background: r.color }} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Feature Highlight ───────────────────────────── */}
      <section className="bg-[#FFFDF8] border-y border-[#D8D3C8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>
              <Star size={11} />
              Điểm nổi bật
            </Badge>
            <h2 className="mt-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
              Giao việc trực tiếp trên trang Manga
            </h2>
            <p className="mt-3 text-[#6B7280] max-w-xl mx-auto text-sm leading-relaxed">
              Mangaka có thể chọn một vùng cụ thể trên trang truyện, mô tả công việc cần làm, chọn trợ lý phụ trách, đặt deadline và theo dõi trạng thái hoàn thành.
            </p>
          </div>
          <TaskAssignmentMock />
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section id="benefits" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>Lợi ích</Badge>
            <h2 className="mt-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
              Lợi ích khi sử dụng MangaFlow
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map(b => (
              <Card key={b.title} className="p-5 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-[#F7F3EA] flex items-center justify-center mb-4 text-[#D72638]">
                  {b.icon}
                </div>
                <h3 className="font-semibold text-sm mb-2">{b.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{b.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-[#1F1F1F] py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-white mb-4" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700 }}>
            Sẵn sàng quản lý quy trình Manga chuyên nghiệp hơn?
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            Tạo không gian làm việc cho series của bạn và đưa toàn bộ quy trình sáng tác, biên tập, xuất bản vào một hệ thống thống nhất.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PrimaryBtn onClick={() => navigate('/register')}>
              Bắt đầu ngay <ArrowRight size={15} />
            </PrimaryBtn>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 font-semibold text-sm transition-colors"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-[#FFFDF8] border-t border-[#D8D3C8] py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src={mangaLogo} alt="MangaFlow" className="w-8 h-8 object-contain" />
                <span className="font-bold text-[#1F1F1F]">MangaFlow</span>
              </div>
              <p className="text-xs text-[#6B7280] max-w-xs leading-relaxed">
                Nền tảng hỗ trợ quản lý quy trình sáng tác, biên tập và xuất bản Manga.
              </p>
            </div>
            <div className="flex flex-wrap gap-5">
              {[
                { label: 'Tính năng', id: 'features' },
                { label: 'Quy trình', id: 'workflow' },
                { label: 'Vai trò', id: 'roles' },
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-xs text-[#6B7280] hover:text-[#1F1F1F] font-medium transition-colors"
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="text-xs text-[#6B7280] hover:text-[#1F1F1F] font-medium transition-colors"
              >
                Đăng nhập
              </button>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[#D8D3C8]">
            <p className="text-xs text-[#6B7280] text-center">© 2026 MangaFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
