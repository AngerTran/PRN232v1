import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Bell, ChevronDown } from 'lucide-react';
import { getStoredUser } from '../../services/authApi';
import {
  getNotifications,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../../services/notificationsApi';

interface TopbarProps {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function Topbar({ title, breadcrumb }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(() => {
    getNotifications(true)
      .then(items => setUnreadCount(items.length))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    refreshUnread();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnread);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnread);
  }, [refreshUnread, location.pathname]);

  const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'TH';

  return (
    <header className="h-14 shrink-0 bg-background border-b border-border flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border" aria-hidden>/</span>}
                {b.href ? (
                  <button
                    type="button"
                    onClick={() => b.href && navigate(b.href)}
                    className="hover:text-foreground transition-colors"
                  >
                    <span>{b.label}</span>
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
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

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
            {user?.name}
          </span>
          <ChevronDown size={14} className="hidden md:block text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>
    </header>
  );
}
