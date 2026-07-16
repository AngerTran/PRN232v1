import { useEffect, useMemo, useState } from 'react';
import { Wallet, CheckCircle, ChevronDown, ChevronUp, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { usePageMeta } from '../../hooks/usePageMeta';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import {
  getPayrollDetail,
  listPayrollSummaries,
  markAssistantPayrollPaid,
  type AssistantPayrollSummary,
} from '../../services/payrollApi';
import { formatVnd } from '../../utils/formatCurrency';
import {
  canMarkPeriodPaid,
  formatPayoutDate,
  PAYROLL_POLICY_SUMMARY,
  periodPayoutMessage,
} from '../../utils/payrollSchedule';

function currentMonthParts() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function hasPayoutBank(row: AssistantPayrollSummary): boolean {
  return Boolean(row.payoutBankName && row.payoutBankAccountNumber && row.payoutBankAccountHolder);
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success('Đã sao chép');
}

export default function AdminPayrollPage() {
  const { setPageMeta } = usePageMeta();
  const [{ year, month }, setPeriod] = useState(currentMonthParts);

  const [summaries, setSummaries] = useState<AssistantPayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTasks, setDetailTasks] = useState<Record<string, { title: string; price: number; seriesTitle?: string }[]>>({});
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markPaidRow, setMarkPaidRow] = useState<AssistantPayrollSummary | null>(null);
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    setPageMeta({ title: 'Chi trả thù lao' });
  }, [setPageMeta]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
      };
    });
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listPayrollSummaries(year, month);
      setSummaries(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được bảng lương.');
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [year, month]);

  const totals = useMemo(() => ({
    unpaid: summaries.reduce((s, x) => s + x.unpaidAmount, 0),
    paid: summaries.reduce((s, x) => s + x.paidAmount, 0),
    assistantsWithDebt: summaries.filter(s => s.unpaidTaskCount > 0).length,
    missingBank: summaries.filter(s => s.unpaidTaskCount > 0 && !hasPayoutBank(s)).length,
  }), [summaries]);

  const periodPayable = canMarkPeriodPaid(year, month);
  const periodMessage = periodPayoutMessage(year, month);

  const toggleExpand = async (assistantId: string) => {
    if (expandedId === assistantId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(assistantId);
    if (detailTasks[assistantId]) return;
    try {
      const detail = await getPayrollDetail(assistantId, year, month);
      setDetailTasks(prev => ({
        ...prev,
        [assistantId]: detail.unpaidTasks.map(t => ({
          title: t.title,
          price: t.price,
          seriesTitle: t.seriesTitle,
        })),
      }));
    } catch {
      toast.error('Không tải được chi tiết task.');
    }
  };

  const openMarkPaid = (row: AssistantPayrollSummary) => {
    if (row.unpaidTaskCount === 0 || !periodPayable) return;
    setMarkPaidRow(row);
    setPaymentReference('');
  };

  const handleMarkPaid = async () => {
    if (!markPaidRow) return;
    const row = markPaidRow;

    setMarkingId(row.assistantId);
    try {
      const result = await markAssistantPayrollPaid({
        assistantId: row.assistantId,
        year,
        month,
        paymentReference: paymentReference.trim() || undefined,
      });
      toast.success(`Đã đánh dấu ${result.tasksMarked} task — ${formatVnd(result.totalAmount)}`);
      setMarkPaidRow(null);
      setPaymentReference('');
      setExpandedId(null);
      setDetailTasks({});
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật.');
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet size={22} className="text-red-600" />
          Chi trả thù lao trợ lý
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Kỳ chi cố định cuối tháng — chi trả ngày {formatPayoutDate(year, month)} cho thù lao tháng {month}/{year}.
          Sau khi chuyển khoản thật, bấm <strong>Đánh dấu đã chi</strong>.
        </p>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${periodPayable ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
        <p className="font-medium">{periodMessage}</p>
        <p className="mt-1 text-xs opacity-90">{PAYROLL_POLICY_SUMMARY}</p>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        Luồng: trợ lý làm task → mangaka duyệt → thù lao tích lũy trong tháng → kế toán chuyển khoản vào ngày 5 tháng sau → Admin xác nhận tại đây.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">Kỳ:</label>
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          value={`${year}-${month}`}
          onChange={e => {
            const [y, m] = e.target.value.split('-').map(Number);
            setPeriod({ year: y, month: m });
          }}
        >
          {monthOptions.map(opt => (
            <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Chờ chi (tháng)</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatVnd(totals.unpaid)}</p>
            <p className="text-xs text-gray-500 mt-1">{totals.assistantsWithDebt} trợ lý còn nợ</p>
            {totals.missingBank > 0 && (
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                {totals.missingBank} trợ lý chưa khai báo STK
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Đã chi (tháng)</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatVnd(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Trợ lý</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summaries.length}</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bảng tổng hợp theo trợ lý</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Đang tải…</p>
          ) : summaries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Không có dữ liệu task đã duyệt trong tháng này.</p>
          ) : (
            <ul className="divide-y">
              {summaries.map(row => {
                const expanded = expandedId === row.assistantId;
                const tasks = detailTasks[row.assistantId] ?? [];
                const bankReady = hasPayoutBank(row);
                return (
                  <li key={row.assistantId} className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{row.assistantName}</p>
                        <p className="text-xs text-gray-500">{row.assistantEmail}</p>
                        {row.unpaidTaskCount > 0 && (
                          <div className="mt-2 text-xs">
                            {bankReady ? (
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-950 space-y-1">
                                <p>
                                  <span className="text-emerald-800/80">NH:</span>{' '}
                                  <strong>{row.payoutBankName}</strong>
                                  <span className="mx-2 text-emerald-700/50">·</span>
                                  <span className="text-emerald-800/80">STK:</span>{' '}
                                  <strong className="font-mono">{row.payoutBankAccountNumber}</strong>
                                  <button
                                    type="button"
                                    className="ml-1.5 inline-flex items-center text-emerald-800 hover:text-emerald-950"
                                    title="Sao chép STK"
                                    onClick={() => void copyText(row.payoutBankAccountNumber ?? '').catch(() => toast.error('Không sao chép được'))}
                                  >
                                    <Copy size={12} />
                                  </button>
                                </p>
                                <p>
                                  <span className="text-emerald-800/80">Chủ TK:</span>{' '}
                                  <strong>{row.payoutBankAccountHolder}</strong>
                                </p>
                              </div>
                            ) : (
                              <p className="text-amber-700 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                Chưa khai báo tài khoản ngân hàng — nhắc trợ lý cập nhật tại Hồ sơ
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-sm mt-2">
                          Chờ chi: <strong className="text-amber-700">{formatVnd(row.unpaidAmount)}</strong>
                          <span className="text-gray-400 mx-2">·</span>
                          Đã chi: <span className="text-emerald-700">{formatVnd(row.paidAmount)}</span>
                          <span className="text-gray-400 mx-2">·</span>
                          {row.unpaidTaskCount} task chờ / {row.paidTaskCount} đã trả
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.unpaidTaskCount > 0 && (
                          <button
                            type="button"
                            disabled={markingId === row.assistantId || !periodPayable}
                            title={periodPayable ? undefined : `Chưa đến ngày chi trả (${formatPayoutDate(year, month)})`}
                            onClick={() => openMarkPaid(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={14} />
                            {markingId === row.assistantId
                              ? 'Đang lưu…'
                              : periodPayable
                                ? 'Đánh dấu đã chi'
                                : 'Chưa đến kỳ chi'}
                          </button>
                        )}
                        {row.unpaidTaskCount > 0 && (
                          <button
                            type="button"
                            onClick={() => void toggleExpand(row.assistantId)}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                            aria-label="Chi tiết"
                          >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                    {expanded && tasks.length > 0 && (
                      <ul className="mt-3 ml-1 border-l-2 border-amber-200 pl-3 space-y-1 text-sm">
                        {tasks.map((t, i) => (
                          <li key={i} className="text-gray-700">
                            {t.title}
                            {t.seriesTitle && <span className="text-gray-400"> · {t.seriesTitle}</span>}
                            <span className="font-medium text-amber-800 ml-2">{formatVnd(t.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal open={markPaidRow != null} onClose={() => setMarkPaidRow(null)} size="sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Xác nhận đã chi trả</h2>
            {markPaidRow && (
              <p className="text-sm text-gray-500 mt-1">
                {markPaidRow.assistantName} — {formatVnd(markPaidRow.unpaidAmount)} ({markPaidRow.unpaidTaskCount} task, tháng {month}/{year})
              </p>
            )}
            {markPaidRow && hasPayoutBank(markPaidRow) && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 space-y-1">
                <p><span className="text-gray-500">Ngân hàng:</span> {markPaidRow.payoutBankName}</p>
                <p>
                  <span className="text-gray-500">STK:</span>{' '}
                  <span className="font-mono font-medium">{markPaidRow.payoutBankAccountNumber}</span>
                </p>
                <p><span className="text-gray-500">Chủ TK:</span> {markPaidRow.payoutBankAccountHolder}</p>
              </div>
            )}
            {markPaidRow && !hasPayoutBank(markPaidRow) && (
              <p className="mt-3 text-sm text-amber-700 flex items-center gap-1">
                <AlertTriangle size={14} />
                Trợ lý chưa khai báo STK trên hệ thống.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mã tham chiếu chuyển khoản (tùy chọn)
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder="VD: FT240716001234"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Nhập mã giao dịch ngân hàng để trợ lý đối chiếu, tránh yêu cầu thanh toán trùng.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMarkPaidRow(null)}>Hủy</Button>
            <Button
              variant="primary"
              loading={markingId != null}
              onClick={() => void handleMarkPaid()}
            >
              Đã chi trả
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
