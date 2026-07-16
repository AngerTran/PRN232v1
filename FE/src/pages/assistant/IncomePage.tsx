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
import { IncomeSummaryCard } from '../../app/components/ui/assistant';
import type { Task } from '../../types/domain';
import { getMyTasks } from '../../services/tasksApi';
import { getMe } from '../../services/authApi';
import { getMyEarnings, type AssistantEarnings } from '../../services/submissionsApi';
import { FileCheck, ClipboardCheck, Clock, CheckCircle, Eye, Wallet, Banknote, Info } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatVnd } from '../../utils/formatCurrency';
import {
  formatNextPayoutLabel,
  formatPayoutDate,
  PAYROLL_POLICY_SUMMARY,
} from '../../utils/payrollSchedule';

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function taskReviewedInMonth(task: Task, monthKey: string): boolean {
  if (!task.reviewedAt) return false;
  return task.reviewedAt.startsWith(monthKey);
}

function isPaid(status?: string | null): boolean {
  return status?.toLowerCase() === 'paid';
}

export default function IncomePage() {
  usePageMeta({ title: 'Thu Nhập' });
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [earnings, setEarnings] = useState<AssistantEarnings | null>(null);
  const [hasPayoutBank, setHasPayoutBank] = useState(true);
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
    getMe()
      .then(me => {
        if (!isActive) return;
        setHasPayoutBank(Boolean(
          me.payoutBankName && me.payoutBankAccountNumber && me.payoutBankAccountHolder
        ));
      })
      .catch(() => {
        if (isActive) setHasPayoutBank(true);
      });
    return () => {
      isActive = false;
    };
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

  const approvedInMonth = tasks.filter(
    t => t.status === 'Approved' && taskReviewedInMonth(t, monthFilter)
  );
  const submittedTasks = tasks.filter(t => t.status === 'Submitted');
  const totalEarnings = earnings?.totalEarnings ?? 0;
  const paidEarnings = earnings?.paidEarnings ?? 0;
  const pendingEarnings = Math.max(0, totalEarnings - paidEarnings);
  const [yearPart, monthPart] = monthFilter.split('-');
  const monthPayoutLabel = formatPayoutDate(Number(yearPart), Number(monthPart));

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

      {!hasPayoutBank && pendingEarnings > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            Bạn có thù lao chờ chi nhưng chưa khai báo tài khoản ngân hàng. Hãy cập nhật tại Hồ sơ để kế toán chuyển đúng kỳ.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
            Cập nhật STK
          </Button>
        </div>
      )}

      <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p>{PAYROLL_POLICY_SUMMARY}</p>
          <p>
            Kỳ chi tiếp theo: <strong className="text-foreground">{formatNextPayoutLabel()}</strong>
            {' '}— thù lao tháng đang chọn dự kiến chi ngày <strong className="text-foreground">{monthPayoutLabel}</strong>.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <IncomeSummaryCard
          title="Tổng thù lao"
          value={formatVnd(totalEarnings)}
          icon={Wallet}
          description={`Tháng ${monthFilter.split('-')[1]}`}
        />
        <IncomeSummaryCard
          title="Chờ chi trả"
          value={formatVnd(pendingEarnings)}
          icon={Banknote}
          description="Đã duyệt, chưa ghi nhận chi"
        />
        <IncomeSummaryCard
          title="Đã chi trả"
          value={formatVnd(paidEarnings)}
          icon={CheckCircle}
          description="Kế toán đã xác nhận"
        />
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
          value={approvedInMonth.length}
          icon={ClipboardCheck}
          description="Trong tháng đã chọn"
        />
        <IncomeSummaryCard
          title="Task Chờ Duyệt"
          value={submittedTasks.length}
          icon={Clock}
          description="Đã nộp, chờ review"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Trang</TableHead>
                <TableHead>Ngày duyệt</TableHead>
                <TableHead className="text-right">Giá</TableHead>
                <TableHead>Chi trả</TableHead>
                <TableHead className="text-right">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedInMonth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có task được duyệt trong tháng này
                  </TableCell>
                </TableRow>
              ) : (
                approvedInMonth.map(task => {
                  const paid = isPaid(task.paymentStatus);
                  const hasPay = (task.price ?? 0) > 0;

                  return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.seriesTitle}</TableCell>
                    <TableCell>Trang {task.pageNumber}</TableCell>
                    <TableCell>
                      {task.reviewedAt
                        ? format(new Date(task.reviewedAt), 'dd/MM/yyyy', { locale: vi })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatVnd(task.price)}
                    </TableCell>
                    <TableCell>
                      {!hasPay ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : (
                        <div>
                          <Badge variant={paid ? 'default' : 'secondary'}>
                            {paid ? 'Đã chi trả' : 'Chờ chi trả'}
                          </Badge>
                          {paid && task.paymentReference && (
                            <p className="text-[10px] text-muted-foreground mt-1">Mã CK: {task.paymentReference}</p>
                          )}
                        </div>
                      )}
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
    </div>
  );
}
