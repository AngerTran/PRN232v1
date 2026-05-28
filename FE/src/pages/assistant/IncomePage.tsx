import { useState } from 'react';
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
import {
  currentAssistant,
  getTasksByStatus,
  assistantIncome,
  getMonthlyIncome,
  getPendingPaymentAmount,
} from '../../data/mockData';
import { Wallet, TrendingUp, Clock, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function IncomePage() {
  usePageMeta({ title: 'Thu Nhập' });
  const navigate = useNavigate();

  const [monthFilter, setMonthFilter] = useState('2025-05');

  const approvedTasksCount = getTasksByStatus(currentAssistant.id, 'Approved').length;
  const submittedTasksCount = getTasksByStatus(currentAssistant.id, 'Submitted').length;

  const monthlyIncome = getMonthlyIncome(currentAssistant.id, monthFilter);
  const pendingPayment = getPendingPaymentAmount(currentAssistant.id);
  const totalIncome = assistantIncome.reduce((sum, i) => sum + i.price, 0);

  // Filter income by month
  const filteredIncome = assistantIncome.filter(i =>
    i.approvedDate.startsWith(monthFilter)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Thu Nhập</h1>
        </div>

        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-05">Tháng 5, 2025</SelectItem>
            <SelectItem value="2025-04">Tháng 4, 2025</SelectItem>
            <SelectItem value="2025-03">Tháng 3, 2025</SelectItem>
            <SelectItem value="2025-02">Tháng 2, 2025</SelectItem>
            <SelectItem value="2025-01">Tháng 1, 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <IncomeSummaryCard
          title="Task Đã Duyệt Tháng Này"
          value={approvedTasksCount}
          icon={CheckCircle}
          description="Task hoàn thành"
        />
        <IncomeSummaryCard
          title="Task Chờ Duyệt"
          value={submittedTasksCount}
          icon={Clock}
          description="Đã nộp, chờ review"
        />
        <IncomeSummaryCard
          title="Thu Nhập Tháng Này"
          value={`${monthlyIncome.toLocaleString('vi-VN')} ¥`}
          icon={TrendingUp}
          description={`Tháng ${monthFilter.split('-')[1]}`}
        />
        <IncomeSummaryCard
          title="Tổng Thu Nhập"
          value={`${totalIncome.toLocaleString('vi-VN')} ¥`}
          icon={Wallet}
          description={`Chờ thanh toán: ${pendingPayment.toLocaleString('vi-VN')} ¥`}
        />
      </div>

      {/* Income Table */}
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
              {filteredIncome.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Không có thu nhập trong tháng này
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncome.map(income => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.taskTitle}</TableCell>
                    <TableCell>{income.seriesTitle}</TableCell>
                    <TableCell>
                      {format(new Date(income.approvedDate), 'dd/MM/yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {income.price.toLocaleString('vi-VN')} ¥
                    </TableCell>
                    <TableCell>
                      <Badge variant={income.paymentStatus === 'Paid' ? 'default' : 'secondary'}>
                        {income.paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/assistant/tasks/${income.taskId}`)}
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

      {filteredIncome.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Tổng thu nhập tháng {monthFilter.split('-')[1]}: {monthlyIncome.toLocaleString('vi-VN')} ¥
        </div>
      )}
    </div>
  );
}
