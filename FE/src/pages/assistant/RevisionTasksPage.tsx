import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../app/components/ui/table';
import type { Task } from '../../data/mockData';
import { getMyTasks } from '../../services/tasksApi';
import { Eye, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function RevisionTasksPage() {
  usePageMeta({ title: 'Task Cần Chỉnh Sửa' });
  const navigate = useNavigate();

  const [revisionTasks, setRevisionTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    getMyTasks()
      .then(tasks => {
        if (isActive) setRevisionTasks(tasks.filter(t => t.status === 'Revision Required'));
      })
      .catch(() => {
        if (isActive) setRevisionTasks([]);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <h1 className="text-2xl font-bold">Task Cần Chỉnh Sửa</h1>
      </div>

      {loading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">Đang tải…</div>
        </Card>
      ) : revisionTasks.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Không có task nào cần chỉnh sửa</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/assistant/tasks')}
            >
              Xem tất cả task
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Series</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Trang</TableHead>
                    <TableHead>Feedback từ Mangaka</TableHead>
                    <TableHead>Deadline Chỉnh Sửa</TableHead>
                    <TableHead className="text-right">Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisionTasks.map(task => {
                    const deadline = new Date(task.deadline);
                    const daysUntil = Math.ceil(
                      (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.seriesTitle}</TableCell>
                        <TableCell>{task.chapterTitle}</TableCell>
                        <TableCell>{task.pageNumber}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm line-clamp-2">
                            {task.mangakaFeedback || 'Xem chi tiết để đọc feedback'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm ${daysUntil < 0 ? 'text-destructive font-medium' : ''}`}>
                            {format(deadline, 'dd/MM/yyyy', { locale: vi })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {daysUntil < 0 ? `Trễ ${Math.abs(daysUntil)} ngày` : `Còn ${daysUntil} ngày`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/assistant/tasks/${task.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem & Sửa
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="text-sm text-muted-foreground">
            {revisionTasks.length} task cần chỉnh sửa
          </div>
        </>
      )}
    </div>
  );
}
