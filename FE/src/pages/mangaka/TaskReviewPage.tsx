import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft,
  CheckCircle,
  RotateCcw,
  AlertCircle,
  User,
  Calendar,
  ExternalLink,
  Banknote,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { TypeBadge } from '../../components/ui/Badge';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import MangaPanelPreview from '../../components/workspace/MangaPanelPreview';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Task } from '../../types/domain';
import { getTask } from '../../services/tasksApi';
import { getTaskSubmissions, reviewSubmission, type SubmissionItem } from '../../services/submissionsApi';
import { formatVnd } from '../../utils/formatCurrency';
import { format } from 'date-fns';

export default function TaskReviewPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [task, setTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'approving' | 'revising' | 'approved' | 'revised'>('idle');
  const [revisionComment, setRevisionComment] = useState('');

  useEffect(() => {
    setPageMeta({
      title: 'Xét duyệt Nhiệm vụ',
      breadcrumb: [
        { label: 'Nhiệm vụ', href: '/mangaka/tasks' },
        { label: 'Xét duyệt' },
      ],
    });
  }, [setPageMeta]);

  const loadData = () => {
    if (!taskId) return;
    setLoading(true);
    Promise.all([
      getTask(taskId).catch(() => null),
      getTaskSubmissions(taskId).catch(() => [] as SubmissionItem[]),
    ])
      .then(([t, subs]) => {
        setTask(t);
        setSubmissions(subs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [taskId]);

  if (loading) {
    return <div className="p-6"><EmptyState title="Đang tải nhiệm vụ…" /></div>;
  }

  if (!task) {
    return <div className="p-6"><EmptyState title="Không tìm thấy nhiệm vụ" /></div>;
  }

  const latest = [...submissions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const submittedResult = latest?.previewImageUrl ?? latest?.fileUrl;
  const assistantName = latest?.assistantName;

  const handleApprove = async () => {
    if (!latest) return;
    setStatus('approving');
    try {
      await reviewSubmission(latest.id, true);
      setStatus('approved');
      loadData();
    } catch {
      setStatus('idle');
    }
  };

  const handleRevise = async () => {
    if (!revisionComment || !latest) return;
    setStatus('revising');
    try {
      await reviewSubmission(latest.id, false, revisionComment);
      setStatus('revised');
      loadData();
    } catch {
      setStatus('idle');
    }
  };

  const isApproved = task.status === 'Approved' || status === 'approved';
  const isPaid = task.paymentStatus?.toLowerCase() === 'paid';
  const canReviewActions =
    status === 'idle'
    && latest
    && (task.status === 'Submitted' || task.status === 'Revision Required');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/mangaka/tasks')}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold truncate">{task.title}</h1>
              <Badge status={task.status} statusKind="task" size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {task.seriesTitle} · {task.chapterTitle} · Trang {task.pageNumber}
            </p>
          </div>
        </div>

        {isApproved && isPaid && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 shrink-0">
            <Banknote size={13} /> Kế toán đã chi {formatVnd(task.price ?? 0)}
          </span>
        )}
        {isApproved && !isPaid && (task.price ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 shrink-0">
            Chờ kế toán chi trả
          </span>
        )}
      </div>

      {isApproved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-900">
            <span className="font-semibold">Đã phê duyệt.</span>
            {' '}Trợ lý đã được thông báo
            {isPaid ? ' · Kế toán đã ghi nhận chi trả.' : (task.price ?? 0) > 0 ? ' · Thù lao chờ kế toán chuyển khoản.' : '.'}
          </p>
        </div>
      )}
      {status === 'revised' && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <RotateCcw size={18} className="text-orange-600 shrink-0" />
          <p className="text-sm font-medium text-orange-900">
            Đã yêu cầu chỉnh sửa — trợ lý nhận kèm phản hồi của bạn.
          </p>
        </div>
      )}

      {/* Meta strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Loại</p>
          <div className="mt-1"><TypeBadge type={task.type} /></div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Trợ lí</p>
          <p className="mt-1 text-sm font-medium inline-flex items-center gap-1.5 truncate">
            <User size={13} className="text-muted-foreground shrink-0" />
            {assistantName ?? '—'}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hạn</p>
          <p className="mt-1 text-sm font-medium inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-muted-foreground shrink-0" />
            {task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy') : '—'}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Thù lao</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatVnd(task.price ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Thanh toán</p>
          <p className={`mt-1 text-sm font-semibold ${
            !isApproved ? 'text-muted-foreground' : isPaid ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {!isApproved ? '—' : isPaid ? 'Đã chi' : 'Chờ kế toán'}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2.5 col-span-2 sm:col-span-3 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bản nộp</p>
          <p className="mt-1 text-sm font-medium">
            {latest ? `v${latest.versionNumber}` : 'Chưa có'}
          </p>
        </div>
      </div>

      {/* Comparison — full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="px-3.5 py-2.5 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trang gốc</p>
          </div>
          <div className="relative bg-[#1f1f1f] flex items-center justify-center min-h-[320px] max-h-[min(70vh,640px)] p-3">
            <div className="relative w-full h-full flex items-center justify-center">
              {task.pageImageUrl ? (
                <div className="relative inline-block max-h-[min(66vh,600px)] max-w-full">
                  <img
                    src={task.pageImageUrl}
                    alt={`Trang ${task.pageNumber}`}
                    className="max-h-[min(66vh,600px)] max-w-full object-contain shadow-lg"
                  />
                  <div
                    className="absolute border-2 border-primary bg-primary/20"
                    style={{
                      left: `${task.region.x}%`,
                      top: `${task.region.y}%`,
                      width: `${task.region.width}%`,
                      height: `${task.region.height}%`,
                    }}
                  >
                    <span className="absolute top-0 left-0 text-[9px] font-bold bg-primary text-white px-1 leading-4">
                      {task.type.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-48 aspect-[3/4]">
                  <MangaPanelPreview layout={(task.pageNumber - 1) % 4} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="px-3.5 py-2.5 border-b bg-muted/30 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kết quả đã nộp</p>
            {latest?.fileUrl && (
              <a
                href={latest.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink size={11} /> Mở file
              </a>
            )}
          </div>
          <div className="relative bg-[#1f1f1f] flex items-center justify-center min-h-[320px] max-h-[min(70vh,640px)] p-3">
            {submittedResult ? (
              <div className="relative inline-block max-h-[min(66vh,600px)] max-w-full">
                <img
                  src={submittedResult}
                  alt="Kết quả đã nộp"
                  className="max-h-[min(66vh,600px)] max-w-full object-contain shadow-lg"
                />
                <div className="absolute left-2 bottom-2 rounded-md bg-black/65 px-2 py-1 text-[11px] text-white">
                  {assistantName ?? 'Trợ lí'} · v{latest?.versionNumber}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <AlertCircle size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Chưa có kết quả được nộp</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hướng dẫn giao việc</CardTitle>
          </CardHeader>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {task.description || '—'}
          </p>
          {latest?.note && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Ghi chú trợ lí
              </p>
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{latest.note}</p>
            </div>
          )}
        </Card>

        {canReviewActions ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hành động xét duyệt</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <textarea
                value={revisionComment}
                onChange={e => setRevisionComment(e.target.value)}
                rows={3}
                placeholder="Nhận xét khi yêu cầu chỉnh sửa…"
                className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleRevise}
                  disabled={!revisionComment || status === 'approving'}
                  className="flex-1"
                >
                  <RotateCcw size={15} /> Yêu cầu chỉnh sửa
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  loading={status === 'approving'}
                  className="flex-1"
                >
                  <CheckCircle size={15} /> Phê duyệt
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col justify-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trạng thái</CardTitle>
            </CardHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isApproved
                ? isPaid
                  ? 'Task đã duyệt. Kế toán đã ghi nhận chi trả thù lao.'
                  : (task.price ?? 0) > 0
                    ? 'Task đã duyệt. Thù lao chờ kế toán chuyển khoản và xác nhận trên hệ thống.'
                    : 'Task đã duyệt. Không có thù lao.'
                : status === 'revised'
                  ? 'Đang chờ trợ lí nộp bản chỉnh sửa.'
                  : 'Chờ kết quả nộp để xét duyệt.'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
