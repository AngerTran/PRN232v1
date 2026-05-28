import { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../app/components/ui/table';
import { TaskStatusBadge } from '../../app/components/ui/assistant';
import { currentAssistant, getTasksByAssistantId, TaskStatus } from '../../data/mockData';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function MyTasksPage() {
  usePageMeta({ title: 'Công Việc Của Tôi' });
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const allTasks = getTasksByAssistantId(currentAssistant.id);

  // Filter tasks
  const filteredTasks = allTasks.filter(task => {
    const matchesSearch =
      task.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo series, task, chapter..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="Pending">Chờ nhận</SelectItem>
            <SelectItem value="In Progress">Đang làm</SelectItem>
            <SelectItem value="Submitted">Đã nộp</SelectItem>
            <SelectItem value="Approved">Đã duyệt</SelectItem>
            <SelectItem value="Revision Required">Cần chỉnh sửa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Trang</TableHead>
                <TableHead>Loại Task</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy task nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map(task => {
                  const deadline = new Date(task.deadline);
                  const daysUntil = Math.ceil(
                    (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isOverdue = daysUntil < 0;
                  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

                  return (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{task.seriesTitle}</TableCell>
                      <TableCell>{task.chapterTitle}</TableCell>
                      <TableCell>{task.pageNumber}</TableCell>
                      <TableCell>{task.type}</TableCell>
                      <TableCell>
                        <div
                          className={`text-sm ${
                            isOverdue
                              ? 'text-destructive font-medium'
                              : isUrgent
                              ? 'text-orange-600'
                              : ''
                          }`}
                        >
                          {format(deadline, 'dd/MM/yyyy', { locale: vi })}
                        </div>
                      </TableCell>
                      <TableCell>{task.price.toLocaleString('vi-VN')} ¥</TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
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
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        Hiển thị {filteredTasks.length} / {allTasks.length} task
      </div>
    </div>
  );
}
