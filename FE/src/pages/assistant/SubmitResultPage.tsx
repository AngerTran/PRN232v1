import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Textarea } from '../../app/components/ui/textarea';
import { MangaPagePreview, TaskStatusBadge, UploadResultBox } from '../../app/components/ui/assistant';
import type { Task } from '../../types/domain';
import { getTask } from '../../services/tasksApi';
import { submitTaskWork } from '../../services/submissionsApi';
import { formatVnd } from '../../utils/formatCurrency';
import {
  ArrowLeft,
  Send,
  CalendarClock,
  Banknote,
  CheckCircle2,
  ImageIcon,
  FileUp,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SubmitResultPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');

  usePageMeta({ title: 'Nộp Kết Quả' });

  useEffect(() => {
    if (!taskId) return;
    let isActive = true;
    getTask(taskId)
      .then(data => {
        if (isActive) setTask(data);
      })
      .catch(() => {
        if (isActive) setTask(null);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [taskId]);

  const previewUrl = useMemo(() => {
    if (!selectedFile?.type.startsWith('image/')) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center text-muted-foreground">Đang tải task…</Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Không tìm thấy task</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/assistant/tasks')}>
            Quay lại danh sách
          </Button>
        </Card>
      </div>
    );
  }

  const deadline = new Date(task.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng upload file kết quả');
      return;
    }

    setSubmitting(true);
    try {
      await submitTaskWork(task.id, { file: selectedFile, note: comment || undefined });
      toast.success('Đã nộp kết quả thành công!');
      setTimeout(() => {
        navigate(`/assistant/tasks/${task.id}`);
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nộp kết quả thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { icon: ImageIcon, label: 'Đối chiếu vùng trên trang gốc', done: true },
    { icon: FileUp, label: 'Tải file kết quả (PSD / PNG / JPG)', done: !!selectedFile },
    { icon: MessageSquare, label: 'Thêm ghi chú (tuỳ chọn)', done: comment.trim().length > 0 },
    { icon: Send, label: 'Gửi cho mangaka duyệt', done: false },
  ];

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl"
      />

      <div className="relative p-5 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="-ml-2" onClick={() => navigate(`/assistant/tasks/${task.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại chi tiết task
          </Button>
          <TaskStatusBadge status={task.status} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.25fr)] items-start">
          {/* Left: context + preview */}
          <Card className="gap-0 overflow-hidden border-border/70 shadow-sm">
            <div className="relative px-5 py-4 bg-gradient-to-br from-foreground/[0.04] to-transparent border-b border-border/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ngữ cảnh công việc
              </p>
              <h1 className="mt-1 text-lg font-bold leading-snug">{task.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {task.seriesTitle}
                <span className="mx-1.5 text-border">·</span>
                {task.chapterTitle}
                <span className="mx-1.5 text-border">·</span>
                Trang {task.pageNumber}
              </p>
            </div>

            <div className="px-5 py-4 border-b border-border/60">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Loại</p>
                  <p className="mt-0.5 text-sm font-semibold">{task.type}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thù lao</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatVnd(task.price)}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg bg-muted/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hạn nộp</p>
                  <p
                    className={`mt-0.5 text-sm font-semibold flex items-center gap-1.5 ${
                      isOverdue ? 'text-destructive' : isUrgent ? 'text-orange-600' : ''
                    }`}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {format(deadline, 'dd/MM/yyyy', { locale: vi })}
                    <span className="font-medium opacity-80">
                      · {isOverdue ? `Trễ ${Math.abs(daysUntil)} ngày` : daysUntil === 0 ? 'Hôm nay' : `Còn ${daysUntil} ngày`}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-b border-border/60 bg-[#1a1a1a]/[0.02]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Trang gốc & vùng làm việc
              </p>
              <MangaPagePreview task={task} imageUrl={task.pageImageUrl || undefined} />
            </div>

            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Tiến trình nộp
              </p>
              <ul className="space-y-2.5">
                {steps.map(step => (
                  <li key={step.label} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        step.done
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={step.done ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Right: submit form */}
          <Card className="gap-0 overflow-hidden border-border/70 shadow-sm">
            <div className="px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent">
              <h2 className="text-xl font-bold tracking-tight">Nộp kết quả</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gửi file hoàn thành để mangaka xét duyệt.
              </p>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-5">
              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      File kết quả
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">PSD, PNG hoặc JPG — tối đa 50MB.</p>
                  </div>
                  {selectedFile && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-md">
                      Đã chọn file
                    </span>
                  )}
                </div>
                <UploadResultBox onFileSelect={setSelectedFile} className="min-h-[140px]" />

                {selectedFile && previewUrl && (
                  <div className="rounded-xl border border-border/70 overflow-hidden bg-muted/40">
                    <div className="px-3 py-2 border-b border-border/60 text-xs font-medium text-muted-foreground">
                      Xem trước file nộp
                    </div>
                    <img
                      src={previewUrl}
                      alt={selectedFile.name}
                      className="max-h-80 w-full object-contain bg-[linear-gradient(45deg,#ececec_25%,transparent_25%),linear-gradient(-45deg,#ececec_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ececec_75%),linear-gradient(-45deg,transparent_75%,#ececec_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]"
                    />
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ghi chú cho mangaka
                </p>
                <p className="text-sm text-muted-foreground">Tuỳ chọn — mô tả nhanh những gì đã làm.</p>
                <Textarea
                  placeholder="Ví dụ: Đã hoàn thành nền theo vùng chọn, dùng screentone 60L cho bóng…"
                  rows={5}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="min-h-[120px] resize-y"
                />
              </section>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-border/60 bg-muted/25 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {selectedFile
                  ? `Sẵn sàng nộp · ${selectedFile.name}`
                  : 'Chọn file kết quả để kích hoạt nút nộp.'}
              </p>
              <Button
                size="lg"
                className="w-full sm:w-auto sm:min-w-[200px]"
                onClick={handleSubmit}
                disabled={submitting || !selectedFile}
              >
                <Send className="h-5 w-5 mr-2" />
                {submitting ? 'Đang nộp…' : 'Nộp cho mangaka'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
