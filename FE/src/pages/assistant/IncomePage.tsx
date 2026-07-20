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
import { getMe } from '../../services/authApi';
import { getMyEarnings, type AssistantEarnings } from '../../services/submissionsApi';
import { ClipboardCheck, Clock, CheckCircle, Eye, Wallet, Banknote, Info } from 'lucide-react';
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
  const monthNum = Number(monthPart);

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Thu nhập</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Thù lao tháng {monthNum} · Chi dự kiến {monthPayoutLabel}
          </p>
        </div>

        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="h-9 w-[168px] bg-background">
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950">
          <p>Có thù lao chờ chi nhưng chưa khai báo STK.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
            Cập nhật STK
          </Button>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-5 border-0 shadow-none bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/15">
          <div className="p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              Tổng thù lao tháng {monthNum}
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground mt-3">
                {formatVnd(totalEarnings)}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5 leading-relaxed">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  {PAYROLL_POLICY_SUMMARY} Kỳ tiếp theo:{' '}
                  <span className="text-foreground font-medium">{formatNextPayoutLabel()}</span>
                </span>
              </p>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-7 grid grid-cols-2 gap-3">
          <Card className="border-border/80 shadow-none">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Chờ chi trả</span>
                <Banknote className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-bold tabular-nums tracking-tight">{formatVnd(pendingEarnings)}</p>
              <p className="text-[11px] text-muted-foreground">Đã duyệt, chưa ghi nhận chi</p>
            </div>
          </Card>
          <Card className="border-border/80 shadow-none">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Đã chi trả</span>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold tabular-nums tracking-tight">{formatVnd(paidEarnings)}</p>
              <p className="text-[11px] text-muted-foreground">Kế toán đã xác nhận</p>
            </div>
          </Card>
          <Card className="border-border/80 shadow-none">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Task đã duyệt</span>
                <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xl font-bold tabular-nums tracking-tight">{approvedInMonth.length}</p>
              <p className="text-[11px] text-muted-foreground">Trong tháng đang chọn</p>
            </div>
          </Card>
          <Card className="border-border/80 shadow-none">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Task chờ duyệt</span>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold tabular-nums tracking-tight">{submittedTasks.length}</p>
              <p className="text-[11px] text-muted-foreground">Đã nộp, chờ mangaka</p>
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Chi tiết thù lao</h2>
          <span className="text-xs text-muted-foreground">{approvedInMonth.length} task</span>
        </div>

        <Card className="shadow-none overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="h-10 text-xs font-semibold">Task</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Series</TableHead>
                  <TableHead className="h-10 text-xs font-semibold text-right">Giá</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">Chi trả</TableHead>
                  <TableHead className="h-10 text-xs font-semibold text-right w-[88px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedInMonth.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                      Chưa có task được duyệt trong tháng này
                    </TableCell>
                  </TableRow>
                ) : (
                  approvedInMonth.map(task => {
                    const paid = isPaid(task.paymentStatus);
                    const hasPay = (task.price ?? 0) > 0;

                    return (
                      <TableRow key={task.id} className="group">
                        <TableCell className="py-3">
                          <p className="text-sm font-medium leading-snug">{task.title}</p>
                          {task.pageNumber != null && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">Trang {task.pageNumber}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {task.seriesTitle || '—'}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-right font-semibold tabular-nums">
                          {formatVnd(task.price)}
                        </TableCell>
                        <TableCell className="py-3">
                          {!hasPay ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <div>
                              <Badge
                                variant={paid ? 'default' : 'secondary'}
                                className="text-[10px] font-medium"
                              >
                                {paid ? 'Đã chi trả' : 'Chờ chi trả'}
                              </Badge>
                              {paid && task.paymentReference && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Mã CK: {task.paymentReference}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs opacity-80 group-hover:opacity-100"
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
      </section>
    </div>
  );
}
