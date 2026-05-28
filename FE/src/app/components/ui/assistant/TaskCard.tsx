import { Task } from '../../../../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../card';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Calendar, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const daysUntilDeadline = Math.ceil(
    (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline >= 0 && daysUntilDeadline <= 3;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {task.seriesTitle} - {task.chapterTitle} - Trang {task.pageNumber}
            </p>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`}>
              <Calendar className="h-4 w-4" />
              <span>
                {isOverdue
                  ? `Trễ ${Math.abs(daysUntilDeadline)} ngày`
                  : `Còn ${daysUntilDeadline} ngày`
                }
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{task.price.toLocaleString('vi-VN')} ¥</span>
            </div>
          </div>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {task.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
