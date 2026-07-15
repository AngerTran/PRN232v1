import { useEffect, useState, type ReactNode } from 'react';
import { Bell, BellOff, AlertTriangle, CheckCircle, Clock, TrendingDown, Send } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import type { Notification, NotifType } from '../../types/domain';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationsApi';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICON: Record<NotifType, ReactNode> = {
  task_submitted: <Clock size={16} className="text-blue-500" />,
  task_approved: <CheckCircle size={16} className="text-green-500" />,
  revision_required: <AlertTriangle size={16} className="text-orange-500" />,
  deadline_warning: <Clock size={16} className="text-orange-500" />,
  ranking_alert: <TrendingDown size={16} className="text-red-500" />,
  submission_update: <Send size={16} className="text-purple-500" />,
  system: <Bell size={16} className="text-gray-500" />,
};

export default function NotificationsPage() {
  const { setPageMeta } = usePageMeta();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => { setPageMeta({ title: 'Thông báo' }); }, [setPageMeta]);

  useEffect(() => {
    let isActive = true;
    getNotifications()
      .then(data => {
        if (isActive) setNotifs(data);
      })
      .catch(() => {
        if (isActive) setNotifs([]);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Giữ trạng thái lạc quan; lần tải sau sẽ đồng bộ lại.
    }
  };

  const markRead = async (id: string) => {
    setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      // Bỏ qua lỗi đánh dấu đã đọc.
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Thông báo</h1>
          {unreadCount > 0 && <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} chưa đọc</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx('px-3 py-1 text-sm font-semibold rounded-lg capitalize transition-all',
                  filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}>{f === 'all' ? 'Tất cả' : 'Chưa đọc'}</button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>Đánh dấu tất cả đã đọc</Button>
          )}
        </div>
      </div>

      <Card padding="none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell size={28} className="text-muted-foreground mb-3 animate-pulse" />
            <p className="text-sm text-muted-foreground">Đang tải thông báo…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BellOff size={28} className="text-muted-foreground mb-3" />
            <p className="font-semibold text-foreground">Tất cả đã đọc</p>
            <p className="text-sm text-muted-foreground mt-1">Không có thông báo{filter === 'unread' ? ' chưa đọc' : ''}.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayed.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                }}
                className={clsx(
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  !n.read ? 'cursor-pointer hover:bg-muted/50 bg-primary/3' : ''
                )}
              >
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  !n.read ? 'bg-primary/10' : 'bg-muted'
                )}>
                  {NOTIF_ICON[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm font-semibold', !n.read ? 'text-foreground' : 'text-foreground/80')}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
