import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { DeadlineCard } from '../../app/components/ui/assistant';
import type { AssistantCalendarEvent } from '../../data/mockData';
import { getMyTasks } from '../../services/tasksApi';
import { Calendar } from 'lucide-react';

export default function WorkCalendarPage() {
  usePageMeta({ title: 'Lịch Làm Việc' });
  const navigate = useNavigate();

  const [allEvents, setAllEvents] = useState<AssistantCalendarEvent[]>([]);

  useEffect(() => {
    let isActive = true;
    getMyTasks()
      .then(tasks => {
        if (!isActive) return;
        const events: AssistantCalendarEvent[] = tasks
          .filter(t => t.deadline && t.status !== 'Approved')
          .map(t => ({
            id: t.id,
            taskId: t.id,
            taskTitle: t.title,
            seriesTitle: t.seriesTitle,
            chapterTitle: t.chapterTitle,
            deadline: t.deadline,
            isOverdue: new Date(t.deadline).getTime() < Date.now(),
          }));
        setAllEvents(events);
      })
      .catch(() => {
        if (isActive) setAllEvents([]);
      });
    return () => {
      isActive = false;
    };
  }, []);

  // Group events by date
  const groupedEvents = allEvents.reduce((groups, event) => {
    const date = new Date(event.deadline).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, typeof allEvents>);

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Categorize by time
  const today = new Date().toDateString();
  const overdueEvents = allEvents.filter(e => new Date(e.deadline).getTime() < new Date().getTime());
  const todayEvents = groupedEvents[today] || [];
  const upcomingEvents = allEvents.filter(
    e => new Date(e.deadline).getTime() > new Date().getTime() && new Date(e.deadline).toDateString() !== today
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Lịch Làm Việc</h1>
      </div>

      {/* Overdue */}
      {overdueEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-destructive">
            Quá Hạn ({overdueEvents.length})
          </h2>
          <div className="grid gap-3">
            {overdueEvents.map(event => (
              <DeadlineCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/assistant/tasks/${event.taskId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Today */}
      {todayEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-orange-600">
            Hôm Nay ({todayEvents.length})
          </h2>
          <div className="grid gap-3">
            {todayEvents.map(event => (
              <DeadlineCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/assistant/tasks/${event.taskId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Sắp Tới ({upcomingEvents.length})
          </h2>
          <div className="grid gap-3">
            {upcomingEvents.map(event => (
              <DeadlineCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/assistant/tasks/${event.taskId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Weekly View */}
      <Card>
        <CardHeader>
          <CardTitle>Xem Theo Tuần</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Không có deadline nào
            </p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(dateStr => {
                const events = groupedEvents[dateStr];
                const date = new Date(dateStr);
                const isToday = dateStr === today;
                const isPast = date.getTime() < new Date().getTime() && !isToday;

                return (
                  <div key={dateStr} className="border-l-2 border-primary pl-4">
                    <h3
                      className={`font-medium mb-2 ${
                        isPast
                          ? 'text-destructive'
                          : isToday
                          ? 'text-orange-600'
                          : 'text-foreground'
                      }`}
                    >
                      {date.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {isToday && ' (Hôm nay)'}
                      {isPast && ' (Quá hạn)'}
                    </h3>
                    <div className="space-y-2">
                      {events.map(event => (
                        <div
                          key={event.id}
                          className="text-sm p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => navigate(`/assistant/tasks/${event.taskId}`)}
                        >
                          <p className="font-medium">{event.taskTitle}</p>
                          <p className="text-muted-foreground">
                            {event.seriesTitle} - {event.chapterTitle}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
