import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Separator } from '../../app/components/ui/separator';
import {
  TaskStatusBadge,
  MangaPagePreview,
  FeedbackBox,
} from '../../app/components/ui/assistant';
import { type Task } from '../../types/domain';
import { getTask, startTask } from '../../services/tasksApi';
import {
  Calendar,
  DollarSign,
  User,
  FileText,
  Play,
  Send,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

function resourceFileName(url: string, index: number): string {
  try {
    const path = new URL(url).pathname;
    const raw = decodeURIComponent(path.split('/').pop() ?? '');
    // Tên file lúc upload có dạng "<guid>_tenfile.ext" → bỏ phần guid prefix nếu có.
    const cleaned = raw.replace(/^[0-9a-fA-F]{32}_/, '');
    return cleaned || `Tài liệu ${index + 1}`;
  } catch {
    return `Tài liệu ${index + 1}`;
  }
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    let isActive = true;
    setLoading(true);
    getTask(taskId)
      .then(data => {
        if (isActive) setTask(data);
      })
      .catch(() => {
        if (isActive) setTask(null);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [taskId]);

  usePageMeta({ title: task ? task.title : 'Chi Tiết Task' });

  const handleStart = async () => {
    if (!task) return;
    setStarting(true);
    try {
      const updated = await startTask(task.id);
      setTask(updated);
      toast.success('Đã bắt đầu task');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể bắt đầu task');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Đang tải chi tiết task…</p>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Không tìm thấy task</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/assistant/tasks')}
          >
            Quay lại danh sách
          </Button>
        </CardContent>
      </Card>
    );
  }

  const deadline = new Date(task.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  const canStart = task.status === 'Pending';
  const canSubmit = task.status === 'In Progress' || task.status === 'Revision Required';

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/assistant/tasks')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách task
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <p className="text-muted-foreground mt-2">
                {task.seriesTitle} - {task.chapterTitle} - Trang {task.pageNumber}
              </p>
            </div>
            <TaskStatusBadge status={task.status} className="self-start" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p
                  className={`font-medium ${
                    isOverdue ? 'text-destructive' : isUrgent ? 'text-orange-600' : ''
                  }`}
                >
                  {format(deadline, 'dd/MM/yyyy', { locale: vi })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOverdue ? `Trễ ${Math.abs(daysUntil)} ngày` : `Còn ${daysUntil} ngày`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá</p>
                <p className="font-medium">{task.price.toLocaleString('vi-VN')} ¥</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giao bởi</p>
                <p className="font-medium">{task.assignedByName || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loại Task</p>
                <p className="font-medium">{task.type}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback if revision required */}
      {task.status === 'Revision Required' && task.mangakaFeedback && (
        <FeedbackBox
          feedback={task.mangakaFeedback}
          from={task.assignedByName || 'Tác giả'}
          date={format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông Tin Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Mô Tả</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {task.description}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Series</p>
                <p className="font-medium mt-1">{task.seriesTitle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Chapter</p>
                <p className="font-medium mt-1">{task.chapterTitle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trang</p>
                <p className="font-medium mt-1">#{task.pageNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Loại công việc</p>
                <p className="font-medium mt-1">{task.type}</p>
              </div>
            </div>

            <Separator />

            {/* Resource Files */}
            <div>
              <h4 className="font-medium mb-3">Tài Liệu Tham Khảo</h4>
              {task.resourceUrls && task.resourceUrls.length > 0 ? (
                <div className="space-y-2">
                  {task.resourceUrls.map((url, idx) => (
                    <Button
                      key={url}
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <a href={url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4 mr-2" />
                        {resourceFileName(url, idx)}
                      </a>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không có tài liệu tham khảo.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manga Page Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Xem trước trang truyện</CardTitle>
          </CardHeader>
          <CardContent>
            <MangaPagePreview task={task} imageUrl={task.pageImageUrl || undefined} />
          </CardContent>
        </Card>
      </div>

      {/* Status Notice */}
      {task.status === 'Submitted' && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Đã nộp kết quả</p>
            <p className="text-sm">Kết quả của bạn đang chờ tác giả duyệt. Vui lòng chờ phản hồi.</p>
          </div>
        </div>
      )}
      {task.status === 'Approved' && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Đã được duyệt</p>
            <p className="text-sm">Tác giả đã chấp nhận kết quả của bạn. Cảm ơn bạn đã hoàn thành công việc!</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(canStart || canSubmit || task.submittedResult) && (
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {canStart && (
              <Button className="flex-1" size="lg" onClick={handleStart} disabled={starting}>
                <Play className="h-5 w-5 mr-2" />
                {starting ? 'Đang bắt đầu…' : 'Bắt Đầu Task'}
              </Button>
            )}
            {canSubmit && (
              <Button
                className="flex-1"
                size="lg"
                onClick={() => navigate(`/assistant/tasks/${task.id}/submit`)}
              >
                <Send className="h-5 w-5 mr-2" />
                Nộp Kết Quả
              </Button>
            )}
            {task.submittedResult && (
              <Button variant="outline" size="lg" className="flex-1">
                <Download className="h-5 w-5 mr-2" />
                Xem File Đã Nộp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
