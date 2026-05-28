import { AssistantCalendarEvent } from '../../../../data/mockData';
import { Card, CardContent } from '../card';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DeadlineCardProps {
  event: AssistantCalendarEvent;
  onClick?: () => void;
}

export function DeadlineCard({ event, onClick }: DeadlineCardProps) {
  const deadline = new Date(event.deadline);
  const today = new Date();
  const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isOverdue = daysUntil < 0;
  const isToday = daysUntil === 0;
  const isUrgent = daysUntil > 0 && daysUntil <= 3;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isOverdue ? 'border-destructive' : isToday ? 'border-orange-500' : isUrgent ? 'border-yellow-500' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2 ${
              isOverdue
                ? 'bg-destructive/10 text-destructive'
                : isToday
                ? 'bg-orange-500/10 text-orange-600'
                : isUrgent
                ? 'bg-yellow-500/10 text-yellow-600'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{event.taskTitle}</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {event.seriesTitle} - {event.chapterTitle}
            </p>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span className={isOverdue ? 'text-destructive font-medium' : isToday ? 'text-orange-600 font-medium' : ''}>
                {isOverdue
                  ? `Trễ ${Math.abs(daysUntil)} ngày`
                  : isToday
                  ? 'Hôm nay'
                  : `Còn ${daysUntil} ngày`
                } - {format(deadline, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
