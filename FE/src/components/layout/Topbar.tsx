import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { getLoggedInUser, notifications } from '../../data/mockData';

interface TopbarProps {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function Topbar({ title, breadcrumb }: TopbarProps) {
  const navigate = useNavigate();
  const user = getLoggedInUser();
  const [searchFocused, setSearchFocused] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'TH';

  return (
    <header className="h-14 shrink-0 bg-background border-b border-border flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border">/</span>}
                {b.href ? (
                  <button
                    onClick={() => b.href && navigate(b.href)}
                    className="hover:text-foreground transition-colors"
                  >
                    {b.label}
                  </button>
                ) : (
                  <span className="font-semibold text-foreground">{b.label}</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <h1 className="font-bold text-base tracking-tight text-foreground truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className={clsx(
          'hidden md:flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-all duration-150',
          searchFocused ? 'w-64 border-primary/50 ring-2 ring-ring/20' : 'w-48 border-border bg-card'
        )}>
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm series, chương…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="hidden md:block text-sm font-semibold text-foreground max-w-[120px] truncate">
            {user?.name ?? 'Mangaka'}
          </span>
          <ChevronDown size={14} className="hidden md:block text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </header>
  );
}
