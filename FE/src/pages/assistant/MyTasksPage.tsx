import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../app/components/ui/select';
import { TaskStatusBadge } from '../../app/components/ui/assistant';
import type { Task } from '../../types/domain';
import { TASK_STATUS_FILTER_OPTIONS, formatTaskStatusLabel } from '../../utils/statusLabels';
import { formatVnd } from '../../utils/formatCurrency';
import { getMyTasks } from '../../services/tasksApi';
import { Search, Eye, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

function deadlineMeta(deadlineIso: string) {
  const deadline = new Date(deadlineIso);
  const daysUntil = Math.ceil(
    (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    deadline,
    daysUntil,
    isOverdue: daysUntil < 0,
    isUrgent: daysUntil >= 0 && daysUntil <= 3,
  };
}

function MetaCell({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold truncate ${valueClassName ?? 'text-foreground'}`}>{value}</p>
    </div>
  );
}

export default function MyTasksPage() {
  usePageMeta({ title: 'Công Việc Của Tôi' });
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    getMyTasks()
      .then(data => {
        if (isActive) setAllTasks(data);
      })
      .catch(() => {
        if (isActive) setAllTasks([]);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const filteredTasks = allTasks.filter(task => {
    const matchesSearch =
      task.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Công việc của tôi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Đang tải…' : `${filteredTasks.length} / ${allTasks.length} nhiệm vụ`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm series, task, chapter…"
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {TASK_STATUS_FILTER_OPTIONS.map(status => (
                <SelectItem key={status} value={status}>
                  {formatTaskStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Đang tải công việc…</Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Không tìm thấy task nào</p>
          <p className="text-sm text-muted-foreground mt-1">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const { deadline, daysUntil, isOverdue, isUrgent } = deadlineMeta(task.deadline);
            const deadlineTone = isOverdue
              ? 'text-destructive'
              : isUrgent
                ? 'text-orange-600'
                : undefined;
            const deadlineLabel = isOverdue
              ? `Trễ ${Math.abs(daysUntil)} ngày`
              : daysUntil === 0
                ? 'Hôm nay'
                : `Còn ${daysUntil} ngày`;
            const accent = isOverdue
              ? 'bg-destructive'
              : isUrgent
                ? 'bg-orange-500'
                : 'bg-primary/40';

            return (
              <Card
                key={task.id}
                className="group relative overflow-hidden border-border/70 hover:border-primary/35 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/assistant/tasks/${task.id}`)}
              >
                <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
                <div className="pl-4 pr-4 py-3.5 sm:pl-5 sm:pr-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded bg-foreground/5 px-2 py-0.5 text-[11px] font-bold tracking-wide text-foreground/75">
                          {task.type}
                        </span>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      <h2 className="text-[15px] sm:text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                        {task.title}
                      </h2>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/assistant/tasks/${task.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Xem
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <MetaCell label="Series" value={task.seriesTitle} />
                    <MetaCell label="Chương" value={task.chapterTitle} />
                    <MetaCell label="Trang" value={`Trang ${task.pageNumber}`} />
                    <MetaCell
                      label="Hạn nộp"
                      value={`${format(deadline, 'dd/MM/yyyy', { locale: vi })} · ${deadlineLabel}`}
                      valueClassName={deadlineTone}
                    />
                    <MetaCell
                      label="Thù lao"
                      value={formatVnd(task.price)}
                      valueClassName="tabular-nums text-foreground"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
