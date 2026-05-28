import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { IncomeSummaryCard, DeadlineCard, TaskCard } from '../../app/components/ui/assistant';
import {
  currentAssistant,
  getTasksByAssistantId,
  getTasksByStatus,
  getCalendarEventsByAssistantId,
  getMonthlyIncome,
  getPendingPaymentAmount,
} from '../../data/mockData';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wallet,
} from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function AssistantDashboardPage() {
  usePageMeta({ title: 'Dashboard' });
  const navigate = useNavigate();

  // Get tasks data
  const allTasks = getTasksByAssistantId(currentAssistant.id);
  const pendingTasks = getTasksByStatus(currentAssistant.id, 'Pending');
  const inProgressTasks = getTasksByStatus(currentAssistant.id, 'In Progress');
  const revisionTasks = getTasksByStatus(currentAssistant.id, 'Revision Required');
  const approvedTasks = getTasksByStatus(currentAssistant.id, 'Approved');

  // Get calendar events (today's deadlines)
  const allDeadlines = getCalendarEventsByAssistantId(currentAssistant.id);
  const today = new Date();
  const todayDeadlines = allDeadlines.filter(event => {
    const deadline = new Date(event.deadline);
    return deadline.toDateString() === today.toDateString();
  });

  // Calculate income
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyIncome = getMonthlyIncome(currentAssistant.id, currentMonth);
  const pendingPayment = getPendingPaymentAmount(currentAssistant.id);

  // Recent approved tasks for display
  const recentApproved = approvedTasks.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Chào mừng trở lại, {currentAssistant.name}
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
          title="Đã Duyệt Tháng Này"
          value={approvedTasks.length}
          icon={CheckCircle}
          description="Task hoàn thành"
        />
        <IncomeSummaryCard
          title="Thu Nhập Tháng"
          value={`${monthlyIncome.toLocaleString('vi-VN')} ¥`}
          icon={Wallet}
          description={`Chờ thanh toán: ${pendingPayment.toLocaleString('vi-VN')} ¥`}
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
