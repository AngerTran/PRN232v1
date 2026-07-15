import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Badge } from '../../app/components/ui/badge';
import { Button } from '../../app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../app/components/ui/select';
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
import { formatVnd } from '../../utils/formatCurrency';

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isPaid(status?: string | null): boolean {
  return status?.toLowerCase() === 'paid';
}

export default function ApprovedTasksPage() {
  usePageMeta({ title: 'Task Đã Duyệt' });
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());

  const monthOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}` };
    });
  }, []);

  useEffect(() => {
    let isActive = true;
    getMyTasks()
      .then(list => {
        if (isActive) setTasks(list.filter(t => t.status === 'Approved'));
      })
      .catch(() => {
        if (isActive) setTasks([]);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const approvedTasks = tasks.filter(
    t => t.reviewedAt?.startsWith(monthFilter) ?? false
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h1 className="text-2xl font-bold">Task Đã Duyệt</h1>
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">Đang tải…</div>
        </Card>
      ) : approvedTasks.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Chưa có task nào được duyệt trong tháng này</p>
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
                    const paid = isPaid(task.paymentStatus);

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.seriesTitle}</TableCell>
                        <TableCell>
                          {task.reviewedAt
                            ? format(new Date(task.reviewedAt), 'dd/MM/yyyy', { locale: vi })
                            : '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatVnd(task.price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={paid ? 'default' : 'secondary'}>
                            {paid ? 'Đã thanh toán' : 'Chờ thanh toán'}
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
            {approvedTasks.length} task đã được duyệt trong tháng đã chọn
          </div>
        </>
      )}
    </div>
  );
}
