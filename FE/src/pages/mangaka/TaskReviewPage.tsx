import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, CheckCircle, RotateCcw, AlertCircle, User, Calendar, ExternalLink } from 'lucide-react';
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
  }, []);

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

  // Bản nộp mới nhất (version cao nhất) là bản cần duyệt.
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

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/mangaka/tasks')} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{task.seriesTitle} · {task.chapterTitle} · Trang {task.pageNumber}</p>
        </div>
        <Badge status={task.status} size="md" />
      </div>

      {/* Result notification */}
      {status === 'approved' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-semibold text-green-800">Nhiệm vụ đã được phê duyệt. Trợ lý đã được thông báo.</p>
        </div>
      )}
      {status === 'revised' && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <RotateCcw size={20} className="text-orange-600" />
          <p className="text-sm font-semibold text-orange-800">Đã yêu cầu chỉnh sửa. Trợ lý đã được thông báo kèm phản hồi của bạn.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Task info card */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Chi tiết Nhiệm vụ</CardTitle></CardHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Loại</span>
              <TypeBadge type={task.type} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Trạng thái</span>
              <Badge status={task.status} />
            </div>
            <div className="flex items-center gap-2">
              <User size={14} className="text-muted-foreground shrink-0" />
              <span className="font-medium">{assistantName ?? 'Chưa rõ trợ lý'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} className="shrink-0" />
              <span>Hạn {task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy') : '—'}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Hướng dẫn</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
            </div>
            {latest?.note && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Ghi chú của trợ lý</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{latest.note}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Page comparison */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card padding="none">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trang gốc</p>
              </div>
              <div className="relative bg-[#F0EBE0] aspect-[3/4]">
                {task.pageImageUrl ? (
                  <img src={task.pageImageUrl} alt={`Trang ${task.pageNumber}`} className="w-full h-full object-cover" />
                ) : (
                  <MangaPanelPreview layout={(task.pageNumber - 1) % 4} />
                )}
                {/* Highlight assigned region */}
                <div
                  className="absolute border-2 border-primary bg-primary/15"
                  style={{
                    left: `${task.region.x}%`, top: `${task.region.y}%`,
                    width: `${task.region.width}%`, height: `${task.region.height}%`,
                  }}
                >
                  <span className="absolute top-0 left-0 text-[8px] font-bold bg-primary text-white px-1">
                    {task.type.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
            </Card>

            <Card padding="none">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kết quả đã nộp</p>
                {latest?.fileUrl && (
                  <a href={latest.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-primary text-xs flex items-center gap-1 hover:underline">
                    <ExternalLink size={11} /> View
                  </a>
                )}
              </div>
              {submittedResult ? (
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  <img src={submittedResult} alt="Submitted result" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-end p-3">
                    <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      Nộp bởi {assistantName ?? 'trợ lý'} · v{latest?.versionNumber}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <AlertCircle size={24} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Chưa có kết quả được nộp</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Approve / Revise actions */}
          {status === 'idle' && latest && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Hành động xét duyệt</CardTitle></CardHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Nhận xét chỉnh sửa (bắt buộc khi yêu cầu chỉnh sửa)
                    </label>
                    <textarea
                      value={revisionComment}
                      onChange={e => setRevisionComment(e.target.value)}
                      rows={3}
                      placeholder="Mô tả những gì cần thay đổi…"
                      className="w-full px-4 py-2.5 text-sm bg-input-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleRevise}
                      disabled={!revisionComment}
                      className="flex-1"
                    >
                      <RotateCcw size={15} /> Yêu cầu chỉnh sửa
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleApprove}
                      className="flex-1"
                    >
                      <CheckCircle size={15} /> Phê duyệt Nhiệm vụ
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
