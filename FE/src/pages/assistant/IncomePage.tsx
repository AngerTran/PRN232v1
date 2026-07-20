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
  const monthNum = monthFilter.split('-')[1];

  return (
    <div className="p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-bold">Thu Nhập</h1>
        </div>

        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p>
            Có thù lao chờ chi nhưng chưa khai báo STK. Cập nhật tại Hồ sơ để nhận đúng kỳ.
          </p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/profile')}>
            Cập nhật STK
          </Button>
        </div>
      )}

      <div className="flex gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
        <p>
          {PAYROLL_POLICY_SUMMARY}{' '}
          Kỳ tiếp theo: <strong className="text-foreground">{formatNextPayoutLabel()}</strong>
          {' '}· Tháng đang chọn chi ngày <strong className="text-foreground">{monthPayoutLabel}</strong>.
        </p>
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-7">
        <IncomeSummaryCard
          compact
          title="Tổng thù lao"
          value={formatVnd(totalEarnings)}
          icon={Wallet}
          description={`Tháng ${monthNum}`}
        />
        <IncomeSummaryCard
          compact
          title="Chờ chi trả"
          value={formatVnd(pendingEarnings)}
          icon={Banknote}
          description="Chưa ghi nhận chi"
        />
        <IncomeSummaryCard
          compact
          title="Đã chi trả"
          value={formatVnd(paidEarnings)}
          icon={CheckCircle}
          description="Đã xác nhận"
        />
        <IncomeSummaryCard
          compact
          title="Bài duyệt"
          value={earnings?.approvedSubmissions ?? 0}
          icon={CheckCircle}
          description={`Tháng ${monthNum}`}
        />
        <IncomeSummaryCard
          compact
          title="Trang duyệt"
          value={earnings?.approvedPages ?? 0}
          icon={FileCheck}
          description={`Tháng ${monthNum}`}
        />
        <IncomeSummaryCard
          compact
          title="Task duyệt"
          value={approvedInMonth.length}
          icon={ClipboardCheck}
          description="Trong tháng"
        />
        <IncomeSummaryCard
          compact
          title="Task chờ"
          value={submittedTasks.length}
          icon={Clock}
          description="Chờ review"
        />
      </div>

      <Card className="shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 text-xs">Task</TableHead>
                <TableHead className="h-9 text-xs">Series</TableHead>
                <TableHead className="h-9 text-xs">Trang</TableHead>
                <TableHead className="h-9 text-xs">Ngày duyệt</TableHead>
                <TableHead className="h-9 text-xs text-right">Giá</TableHead>
                <TableHead className="h-9 text-xs">Chi trả</TableHead>
                <TableHead className="h-9 text-xs text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedInMonth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                    Chưa có task được duyệt trong tháng này
                  </TableCell>
                </TableRow>
              ) : (
                approvedInMonth.map(task => {
                  const paid = isPaid(task.paymentStatus);
                  const hasPay = (task.price ?? 0) > 0;

                  return (
                  <TableRow key={task.id}>
                    <TableCell className="py-2 text-sm font-medium">{task.title}</TableCell>
                    <TableCell className="py-2 text-sm">{task.seriesTitle}</TableCell>
                    <TableCell className="py-2 text-sm">Trang {task.pageNumber}</TableCell>
                    <TableCell className="py-2 text-sm">
                      {task.reviewedAt
                        ? format(new Date(task.reviewedAt), 'dd/MM/yyyy', { locale: vi })
                        : '—'}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right font-medium">
                      {formatVnd(task.price)}
                    </TableCell>
                    <TableCell className="py-2">
                      {!hasPay ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <div>
                          <Badge variant={paid ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {paid ? 'Đã chi trả' : 'Chờ chi trả'}
                          </Badge>
                          {paid && task.paymentReference && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">Mã CK: {task.paymentReference}</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => navigate(`/assistant/tasks/${task.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
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
