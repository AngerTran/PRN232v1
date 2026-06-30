import { useState, type ReactNode } from 'react';
import mangaLogo from '../../imports/image-10.png';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, BookOpen, PlusSquare, FileText, ClipboardList,
  Send, BarChart2, Bell, User, Settings, LogOut,
  CheckCircle, AlertTriangle, Wallet, Calendar as CalendarIcon,
  Shield, Gavel, Star, CalendarDays, Vote, TrendingUp, BarChart3,
  ChevronLeft, ChevronRight,
  Users, UserPlus, ShieldCheck, Activity, SlidersHorizontal, Mail,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getStoredUser } from '../../services/authApi';
import { logoutWithApi } from '../../services/authApi';

interface NavItem {
  label: string;
  icon: ReactNode;
  href: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const MANGAKA_GROUPS: NavGroup[] = [
  {
    label: 'Sáng tác',
    items: [
      { label: 'Tổng quan', icon: <LayoutDashboard size={18} />, href: '/mangaka/dashboard', exact: true },
      { label: 'Series của tôi', icon: <BookOpen size={18} />, href: '/mangaka/series' },
      { label: 'Tạo Series', icon: <PlusSquare size={18} />, href: '/mangaka/series/create', exact: true },
      { label: 'Chương', icon: <FileText size={18} />, href: '/mangaka/chapters' },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { label: 'Nhiệm vụ', icon: <ClipboardList size={18} />, href: '/mangaka/tasks' },
      { label: 'Trợ lý', icon: <Users size={18} />, href: '/mangaka/assistants' },
      { label: 'Editor', icon: <ShieldCheck size={18} />, href: '/mangaka/editors' },
      { label: 'Mời hội đồng', icon: <Gavel size={18} />, href: '/mangaka/board-invite' },
      { label: 'Nộp series', icon: <Send size={18} />, href: '/mangaka/submissions' },
      { label: 'Xếp hạng', icon: <BarChart2 size={18} />, href: '/mangaka/ranking' },
    ],
  },
];

const ASSISTANT_GROUPS: NavGroup[] = [
  {
    label: 'Công việc',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/assistant/dashboard', exact: true },
      { label: 'Công việc của tôi', icon: <ClipboardList size={18} />, href: '/assistant/tasks' },
      { label: 'Lời mời studio', icon: <Mail size={18} />, href: '/assistant/invitations' },
      { label: 'Cần chỉnh sửa', icon: <AlertTriangle size={18} />, href: '/assistant/revisions' },
      { label: 'Đã duyệt', icon: <CheckCircle size={18} />, href: '/assistant/approved' },
    ],
  },
  {
    label: 'Kế hoạch',
    items: [
      { label: 'Thu nhập', icon: <Wallet size={18} />, href: '/assistant/income' },
      { label: 'Lịch làm việc', icon: <CalendarIcon size={18} />, href: '/assistant/calendar' },
    ],
  },
];

const EDITOR_GROUPS: NavGroup[] = [
  {
    label: 'Biên tập',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/editor/dashboard', exact: true },
      { label: 'Series phụ trách', icon: <BookOpen size={18} />, href: '/editor/series' },
      { label: 'Lời mời phụ trách', icon: <Mail size={18} />, href: '/editor/invitations' },
      { label: 'Chapter Reviews', icon: <FileText size={18} />, href: '/editor/reviews' },
      { label: 'Tiến độ Studio', icon: <Activity size={18} />, href: '/editor/studio' },
    ],
  },
  {
    label: 'Theo dõi',
    items: [
      { label: 'Ranking Watch', icon: <BarChart2 size={18} />, href: '/editor/ranking-watch' },
      { label: 'Series Defense', icon: <Shield size={18} />, href: '/editor/series-defense' },
    ],
  },
];

const BOARD_GROUPS: NavGroup[] = [
  {
    label: 'Quản lý',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/board/dashboard', exact: true },
      { label: 'Duyệt Series', icon: <Gavel size={18} />, href: '/board/submissions' },
      { label: 'Lời mời xét duyệt', icon: <Mail size={18} />, href: '/board/review-invitations' },
      { label: 'Series Đã Nhận', icon: <Star size={18} />, href: '/board/approved-series' },
      { label: 'Lịch Xuất Bản', icon: <CalendarDays size={18} />, href: '/board/publishing-schedule' },
    ],
  },
  {
    label: 'Phân tích',
    items: [
      { label: 'Nhập Vote', icon: <Vote size={18} />, href: '/board/vote-input' },
      { label: 'Bảng Xếp Hạng', icon: <TrendingUp size={18} />, href: '/board/rankings' },
      { label: 'Quyết Định Series', icon: <AlertTriangle size={18} />, href: '/board/series-decisions' },
      { label: 'Báo Cáo', icon: <BarChart3 size={18} />, href: '/board/reports' },
    ],
  },
];

const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Quản trị',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/admin/dashboard', exact: true },
      { label: 'Người dùng', icon: <Users size={18} />, href: '/admin/users' },
      { label: 'Vai trò', icon: <ShieldCheck size={18} />, href: '/admin/roles' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { label: 'Hoạt động', icon: <Activity size={18} />, href: '/admin/activity' },
      { label: 'Cài đặt Admin', icon: <SlidersHorizontal size={18} />, href: '/admin/settings' },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { label: 'Thông báo', icon: <Bell size={18} />, href: '/notifications' },
  { label: 'Hồ sơ', icon: <User size={18} />, href: '/profile' },
  { label: 'Cài đặt', icon: <Settings size={18} />, href: '/settings' },
];


export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const [collapsed, setCollapsed] = useState(false);

  const GROUPS = user?.role === 'admin'
    ? ADMIN_GROUPS
    : user?.role === 'assistant'
    ? ASSISTANT_GROUPS
    : user?.role === 'editor'
    ? EDITOR_GROUPS
    : user?.role === 'board'
    ? BOARD_GROUPS
    : MANGAKA_GROUPS;

  const allHrefs = GROUPS.flatMap(group => group.items.map(item => item.href));

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;

    const matches = location.pathname === href || location.pathname.startsWith(href + '/');
    if (!matches) return false;

    // Nếu có mục khác cụ thể hơn (href dài hơn) cũng khớp đường dẫn hiện tại,
    // thì mục ngắn hơn không được tính là active (vd /mangaka/series vs /mangaka/series/create).
    const hasMoreSpecific = allHrefs.some(
      other =>
        other !== href &&
        other.startsWith(href + '/') &&
        (location.pathname === other || location.pathname.startsWith(other + '/'))
    );
    return !hasMoreSpecific;
  };

  const handleLogout = async () => {
    await logoutWithApi();
    navigate('/login');
  };

  return (
    <aside className={clsx(
      'shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-full overflow-hidden border-r border-sidebar-border transition-all duration-200',
      collapsed ? 'w-[64px]' : 'w-[220px]'
    )}>
      {/* Brand */}
      <div className={clsx(
        'h-14 shrink-0 border-b border-sidebar-border flex items-center',
        collapsed ? 'px-0 justify-center' : 'px-5'
      )}>
        <div className={clsx('flex items-center', collapsed ? 'justify-center' : 'gap-2.5')}>
          <img
            src={mangaLogo}
            alt="MangaFlow"
            className={clsx('object-contain shrink-0', collapsed ? 'w-8 h-8' : 'w-9 h-9')}
          />
          {!collapsed && (
            <div>
              <p className="font-bold text-sm tracking-tight text-sidebar-foreground">MangaFlow</p>
              <p className="text-[10px] text-sidebar-foreground/50 tracking-widest uppercase">Manga Studio</p>
            </div>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className={clsx('flex-1 py-3 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
        {GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-3 pt-3 border-t border-sidebar-border' : ''}>
            {!collapsed && (
              <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/30 mb-1.5">
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && <div className="mb-1.5" />}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  title={collapsed ? item.label : undefined}
                  className={clsx(
                    'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 text-left group',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive(item.href, item.exact)
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <span className={clsx(
                    isActive(item.href, item.exact)
                      ? 'text-white'
                      : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                  )}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className={clsx(
        'border-t border-sidebar-border py-2 space-y-0.5',
        collapsed ? 'px-2' : 'px-3'
      )}>
        {BOTTOM_NAV.map(item => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            title={collapsed ? item.label : undefined}
            className={clsx(
              'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 text-left group',
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
              isActive(item.href)
                ? 'bg-primary text-white'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <span className={clsx(
              isActive(item.href)
                ? 'text-white'
                : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
            )}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={clsx(
            'w-full flex items-center rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-red-900/30 hover:text-red-400 transition-all duration-150 text-left',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
          )}
        >
          <LogOut size={18} className="text-sidebar-foreground/50" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center rounded-xl py-2 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </aside>
  );
}
