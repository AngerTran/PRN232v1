import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, DollarSign, Trash2, CreditCard, Loader2, CheckCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkspaceAssistant, WorkspaceTask } from '../../services/workspaceApi';
import { TypeBadge } from '../ui/Badge';
import { format } from 'date-fns';
import { createTaskPayment } from '../../services/paymentApi';
import { toast } from 'sonner';
import { getStoredUser } from '../../services/authApi';
import { getTaskSubmissions, reviewSubmission, type SubmissionItem } from '../../services/submissionsApi';

const STATUS_DOT: Record<string, string> = {
  'Pending': 'bg-gray-400',
  'In Progress': 'bg-purple-500',
  'Submitted': 'bg-blue-500',
  'Approved': 'bg-green-500',
  'Revision Required': 'bg-orange-500',
};

const STATUS_LABEL_VI: Record<string, string> = {
  'Pending': 'Chờ thực hiện',
  'In Progress': 'Đang thực hiện',
  'Submitted': 'Đã nộp',
  'Approved': 'Đã duyệt',
  'Revision Required': 'Cần chỉnh sửa',
};

interface TaskListProps {
  tasks: WorkspaceTask[];
  assistants: WorkspaceAssistant[];
  onHoverTask?: (region: WorkspaceTask['region'] | null) => void;
  onDeleteTask?: (id: string) => void;
  deletingTaskId?: string | null;
  onTaskReviewed?: () => void;
}

export default function TaskList({ tasks, assistants, onHoverTask, onDeleteTask, deletingTaskId, onTaskReviewed }: TaskListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payingTaskId, setPayingTaskId] = useState<string | null>(null);
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [revisionComment, setRevisionComment] = useState('');
  const [submissionsByTask, setSubmissionsByTask] = useState<Record<string, SubmissionItem[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null);
  const assistantNames = new Map(assistants.map(assistant => [assistant.id, assistant.name]));
  const user = getStoredUser();

  const handlePayment = async (taskId: string) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán');
      return;
    }

    const isStaff = ['admin', 'mangaka', 'editor'].includes(user.role);

    if (!isStaff) {
      toast.error('Chỉ mangaka/editor/admin mới có quyền thanh toán cho task này');
      return;
    }

    setPayingTaskId(taskId);
    try {
      const response = await createTaskPayment(taskId, {});
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl;
      } else {
        toast.error('Không thể tạo URL thanh toán');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Có lỗi xảy ra khi tạo thanh toán');
    } finally {
      setPayingTaskId(null);
    }
  };

  const loadSubmissions = async (taskId: string) => {
    if (submissionsByTask[taskId]) return;
    setLoadingSubmissions(taskId);
    try {
      const subs = await getTaskSubmissions(taskId);
      setSubmissionsByTask(prev => ({ ...prev, [taskId]: subs }));
    } catch {
      toast.error('Không thể tải bản nộp');
    } finally {
      setLoadingSubmissions(null);
    }
  };

  const handleExpand = async (task: WorkspaceTask) => {
    const next = expanded === task.id ? null : task.id;
    setExpanded(next);
    setRevisionComment('');
    if (next && task.status === 'Submitted') {
      await loadSubmissions(task.id);
    }
  };

  const handleApprove = async (taskId: string, submissionId: string) => {
    setReviewingTaskId(taskId);
    try {
      await reviewSubmission(submissionId, true);
      toast.success('Đã duyệt nhiệm vụ');
      onTaskReviewed?.();
    } catch {
      toast.error('Không thể duyệt nhiệm vụ');
    } finally {
      setReviewingTaskId(null);
    }
  };

  const handleRevise = async (taskId: string, submissionId: string) => {
    if (!revisionComment.trim()) {
      toast.error('Vui lòng nhập phản hồi chỉnh sửa');
      return;
    }
    setReviewingTaskId(taskId);
    try {
      await reviewSubmission(submissionId, false, revisionComment.trim());
      toast.success('Đã yêu cầu chỉnh sửa');
      setRevisionComment('');
      onTaskReviewed?.();
    } catch {
      toast.error('Không thể gửi yêu cầu chỉnh sửa');
    } finally {
      setReviewingTaskId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Chưa có nhiệm vụ nào cho trang này.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#3A3A3A]">
      {tasks.map(task => {
        const assistantName = task.assistantName ?? assistantNames.get(task.assistantId) ?? 'Unknown assistant';
        const isExpanded = expanded === task.id;
        const subs = submissionsByTask[task.id] ?? [];
        const latest = [...subs].sort((a, b) => b.versionNumber - a.versionNumber)[0];
        const previewUrl = latest?.previewImageUrl ?? latest?.fileUrl ?? task.submittedResult;

        return (
          <div
            key={task.id}
            className="hover:bg-[#2E2E2E] transition-colors"
            onMouseEnter={() => onHoverTask?.(task.region)}
            onMouseLeave={() => onHoverTask?.(null)}
          >
            <button
              onClick={() => handleExpand(task)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left"
            >
              <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', STATUS_DOT[task.status] ?? 'bg-gray-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TypeBadge type={task.type} className="text-[9px]" />
                  <span className="text-xs text-gray-400 truncate">{assistantName}</span>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp size={14} className="text-gray-500 shrink-0 mt-0.5" />
              ) : (
                <ChevronDown size={14} className="text-gray-500 shrink-0 mt-0.5" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 pl-9 space-y-2 text-xs text-gray-400">
                <p className="leading-relaxed">{task.description}</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {format(new Date(task.deadline), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={11} />
                    ¥{task.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Trạng thái:</span>
                  <span className={clsx('font-semibold', {
                    'text-green-400': task.status === 'Approved',
                    'text-blue-400': task.status === 'Submitted',
                    'text-orange-400': task.status === 'Revision Required',
                    'text-purple-400': task.status === 'In Progress',
                    'text-gray-400': task.status === 'Pending',
                  })}>
                    {STATUS_LABEL_VI[task.status] ?? task.status}
                  </span>
                </div>

                {task.status === 'Submitted' && (
                  <div className="mt-2 space-y-2 rounded-lg border border-[#3A3A3A] bg-[#242424] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-300">Xét duyệt nhanh</p>
                    {loadingSubmissions === task.id ? (
                      <p className="text-gray-500">Đang tải bản nộp…</p>
                    ) : previewUrl ? (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative aspect-video rounded-md overflow-hidden bg-[#1A1A1A] border border-[#3A3A3A]"
                      >
                        <img src={previewUrl} alt="Kết quả nộp" className="w-full h-full object-contain" />
                        <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                          <ExternalLink size={9} /> Mở
                        </span>
                      </a>
                    ) : (
                      <p className="text-gray-500">Chưa có ảnh xem trước.</p>
                    )}
                    {latest?.note && (
                      <p className="text-gray-400 italic">Ghi chú trợ lý: {latest.note}</p>
                    )}
                    {latest && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={revisionComment}
                          onChange={e => setRevisionComment(e.target.value)}
                          rows={2}
                          placeholder="Phản hồi khi yêu cầu chỉnh sửa…"
                          className="w-full px-2 py-1.5 text-xs bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-gray-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(task.id, latest.id)}
                            disabled={reviewingTaskId === task.id}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-green-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                          >
                            <CheckCircle size={12} />
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevise(task.id, latest.id)}
                            disabled={reviewingTaskId === task.id || !revisionComment.trim()}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-orange-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                          >
                            <RotateCcw size={12} />
                            Chỉnh sửa
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {task.status === 'Approved' && task.submittedResult && (
                  <a
                    href={task.submittedFileUrl ?? task.submittedResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-400 hover:text-green-300"
                  >
                    <ExternalLink size={11} /> Xem kết quả đã duyệt
                  </a>
                )}

                {onDeleteTask && task.status !== 'Approved' && (
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    disabled={deletingTaskId === task.id}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Trash2 size={12} />
                    {deletingTaskId === task.id ? 'Đang hủy…' : 'Hủy task'}
                  </button>
                )}
                {task.status === 'Approved' && task.paymentStatus?.toLowerCase() !== 'paid' && (
                  <div className="mt-3 pt-3 border-t border-[#3A3A3A]">
                    <button
                      onClick={() => handlePayment(task.id)}
                      disabled={payingTaskId === task.id}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {payingTaskId === task.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Đang chuyển hướng...
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} />
                          Thanh toán ({task.price.toLocaleString()} ¥)
                        </>
                      )}
                    </button>
                    <p className="mt-1 text-[10px] text-gray-500 text-center">
                      Chuyển sang VNPay sandbox để thanh toán
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
