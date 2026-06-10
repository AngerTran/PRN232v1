import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { IncomeSummaryCard, DeadlineCard, TaskCard } from '../../app/components/ui/assistant';
import type { AssistantCalendarEvent, Task } from '../../types/domain';
import { getMyTasks } from '../../services/tasksApi';
import { getMyEarnings, type AssistantEarnings } from '../../services/submissionsApi';
import { getStoredUser } from '../../services/authApi';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function AssistantDashboardPage() {
  usePageMeta({ title: 'Dashboard' });
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [earnings, setEarnings] = useState<AssistantEarnings | null>(null);
  const userName = getStoredUser()?.name ?? 'bạn';

  useEffect(() => {
    let isActive = true;
    Promise.all([getMyTasks(), getMyEarnings().catch(() => null)])
      .then(([taskList, earn]) => {
        if (!isActive) return;
        setTasks(taskList);
        setEarnings(earn);
      })
      .catch(() => {
        if (isActive) {
          setTasks([]);
          setEarnings(null);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const revisionTasks = tasks.filter(t => t.status === 'Revision Required');
  const approvedTasks = tasks.filter(t => t.status === 'Approved');

  // Deadline hôm nay suy ra trực tiếp từ danh sách task có hạn nộp.
  const todayStr = new Date().toDateString();
  const todayDeadlines: AssistantCalendarEvent[] = tasks
    .filter(t => t.deadline && new Date(t.deadline).toDateString() === todayStr)
    .map(t => ({
      id: t.id,
      taskId: t.id,
      taskTitle: t.title,
      seriesTitle: t.seriesTitle,
      chapterTitle: t.chapterTitle,
      deadline: t.deadline,
      isOverdue: new Date(t.deadline).getTime() < Date.now(),
    }));

  const recentApproved = approvedTasks.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Chào mừng trở lại, {userName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bạn có <span className="font-medium text-foreground">{pendingTasks.length} task mới</span> và{' '}
            <span className="font-medium text-foreground">{inProgressTasks.length} task đang làm</span>.
            {revisionTasks.length > 0 && (
              <span className="text-orange-600 font-medium">
                {' '}Có {revisionTasks.length} task cần chỉnh sửa.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <IncomeSummaryCard
          title="Task Mới"
          value={pendingTasks.length}
          icon={Briefcase}
          description="Chờ bạn nhận"
        />
        <IncomeSummaryCard
          title="Đang Làm"
          value={inProgressTasks.length}
          icon={Clock}
          description="Task đang thực hiện"
        />
        <IncomeSummaryCard
          title="Cần Chỉnh Sửa"
          value={revisionTasks.length}
          icon={AlertTriangle}
          description="Task yêu cầu sửa"
        />
        <IncomeSummaryCard
          title="Đã Duyệt"
          value={approvedTasks.length}
          icon={CheckCircle}
          description="Task hoàn thành"
        />
        <IncomeSummaryCard
          title="Trang Đã Duyệt"
          value={earnings?.approvedPages ?? 0}
          icon={FileCheck}
          description={`${earnings?.approvedSubmissions ?? 0} bài được duyệt`}
        />
      </div>

      {/* Today's Deadlines */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Deadline Hôm Nay</h2>
        {todayDeadlines.length > 0 ? (
          <div className="grid gap-3">
            {todayDeadlines.map(event => (
              <DeadlineCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/assistant/tasks/${event.taskId}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Không có deadline nào hôm nay
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revision Required Tasks */}
      {revisionTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Task Cần Chỉnh Sửa</h2>
          <div className="grid gap-3">
            {revisionTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/assistant/tasks/${task.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Approved Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Task Đã Duyệt Gần Đây</h2>
        {recentApproved.length > 0 ? (
          <div className="grid gap-3">
            {recentApproved.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/assistant/tasks/${task.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Chưa có task nào được duyệt
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
