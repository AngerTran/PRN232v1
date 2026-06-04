import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
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
import { IncomeSummaryCard } from '../../app/components/ui/assistant';
import type { Task } from '../../data/mockData';
import { getMyTasks } from '../../services/tasksApi';
import { getMyEarnings, type AssistantEarnings } from '../../services/submissionsApi';
import { FileCheck, ClipboardCheck, Clock, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function IncomePage() {
  usePageMeta({ title: 'Thu Nhập' });
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [earnings, setEarnings] = useState<AssistantEarnings | null>(null);
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());

  // 6 tháng gần nhất, tạo động theo ngày hiện tại.
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
        if (isActive) setTasks(list);
      })
      .catch(() => {
        if (isActive) setTasks([]);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const [year, month] = monthFilter.split('-').map(Number);
    getMyEarnings(year, month)
      .then(result => {
        if (isActive) setEarnings(result);
      })
      .catch(() => {
        if (isActive) setEarnings(null);
      });
    return () => {
      isActive = false;
    };
  }, [monthFilter]);

  const approvedTasks = tasks.filter(t => t.status === 'Approved');
  const submittedTasks = tasks.filter(t => t.status === 'Submitted');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Thu Nhập</h1>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <IncomeSummaryCard
          title="Bài Được Duyệt"
          value={earnings?.approvedSubmissions ?? 0}
          icon={CheckCircle}
          description={`Tháng ${monthFilter.split('-')[1]}`}
        />
        <IncomeSummaryCard
          title="Trang Được Duyệt"
          value={earnings?.approvedPages ?? 0}
          icon={FileCheck}
          description={`Tháng ${monthFilter.split('-')[1]}`}
        />
        <IncomeSummaryCard
          title="Task Đã Duyệt"
          value={approvedTasks.length}
          icon={ClipboardCheck}
          description="Tổng số task đã duyệt"
        />
        <IncomeSummaryCard
          title="Task Chờ Duyệt"
          value={submittedTasks.length}
          icon={Clock}
          description="Đã nộp, chờ review"
        />
      </div>

      {/* Approved tasks table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Trang</TableHead>
                <TableHead>Hạn Nộp</TableHead>
                <TableHead className="text-right">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chưa có task nào được duyệt
                  </TableCell>
                </TableRow>
              ) : (
                approvedTasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.seriesTitle}</TableCell>
                    <TableCell>Trang {task.pageNumber}</TableCell>
                    <TableCell>
                      {task.deadline
                        ? format(new Date(task.deadline), 'dd/MM/yyyy', { locale: vi })
                        : '—'}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Backend hiện chưa cung cấp số tiền theo task; trang hiển thị số trang/bài được duyệt từ
        thống kê thu nhập.
      </p>
    </div>
  );
}
