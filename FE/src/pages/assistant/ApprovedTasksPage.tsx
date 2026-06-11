import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Badge } from '../../app/components/ui/badge';
import { Button } from '../../app/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../app/components/ui/table';
import type { Task } from '../../types/domain';
import { getMyTasks } from '../../services/tasksApi';
import { Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function ApprovedTasksPage() {
  usePageMeta({ title: 'Task Đã Duyệt' });
  const navigate = useNavigate();

  const [approvedTasks, setApprovedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    getMyTasks()
      .then(tasks => {
        if (isActive) setApprovedTasks(tasks.filter(t => t.status === 'Approved'));
      })
      .catch(() => {
        if (isActive) setApprovedTasks([]);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  // Backend chưa có trạng thái thanh toán, nên hiển thị chờ thanh toán.
  const getPaymentStatus = (taskId: string) => {
    return 'Pending';
  };

  const getApprovedDate = (taskId: string) => {
    return approvedTasks.find(task => task.id === taskId)?.createdAt || new Date().toISOString().split('T')[0];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <h1 className="text-2xl font-bold">Task Đã Duyệt</h1>
      </div>

      {loading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">Đang tải…</div>
        </Card>
      ) : approvedTasks.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Chưa có task nào được duyệt</p>
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
                    <TableHead>Task</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Ngày Duyệt</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Thanh Toán</TableHead>
                    <TableHead className="text-right">Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedTasks.map(task => {
                    const paymentStatus = getPaymentStatus(task.id);
                    const approvedDate = getApprovedDate(task.id);

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.seriesTitle}</TableCell>
                        <TableCell>
                          {format(new Date(approvedDate), 'dd/MM/yyyy', { locale: vi })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {task.price.toLocaleString('vi-VN')} ¥
                        </TableCell>
                        <TableCell>
                          <Badge variant={paymentStatus === 'Paid' ? 'default' : 'secondary'}>
                            {paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/assistant/tasks/${task.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem
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
            {approvedTasks.length} task đã được duyệt
          </div>
        </>
      )}
    </div>
  );
}
