import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { User, Calendar, Banknote, FileText, Plus } from 'lucide-react';
import type { WorkspaceAssistant } from '../../services/workspaceApi';
import { formatVnd } from '../../utils/formatCurrency';
import { getTaskTypeColor, getTaskTypeLabel, normalizeTaskType } from '../../utils/taskTypes';

export interface TaskTypeOption {
  taskType: string;
  price: number;
  displayName?: string;
}

interface TaskPanelProps {
  hasRegion: boolean;
  region?: { x: number; y: number; width: number; height: number } | null;
  onSelectRegion: () => void;
  isSelectingRegion: boolean;
  regionLabel?: string;
  onAssignTask?: (data: TaskFormData & { region: string; files: File[] }) => void | Promise<void>;
  assistants: WorkspaceAssistant[];
  isSubmitting?: boolean;
  lockedAssistantId?: string;
  openTaskHint?: string;
  /** Loại task từ bảng giá series — đồng bộ với tab Giá thù lao. */
  taskOptions?: TaskTypeOption[];
}

export interface TaskFormData {
  type: string;
  assistantId: string;
  description: string;
  deadline: string;
  price: number;
}

export default function TaskPanel({
  hasRegion,
  region,
  onAssignTask,
  assistants,
  isSubmitting = false,
  lockedAssistantId,
  openTaskHint,
  taskOptions = [],
}: TaskPanelProps) {
  const options = useMemo(
    () => taskOptions.map(o => ({ ...o, taskType: normalizeTaskType(o.taskType) })),
    [taskOptions]
  );

  const [form, setForm] = useState<TaskFormData>({
    type: options[0]?.taskType ?? 'background',
    assistantId: lockedAssistantId ?? assistants[0]?.id ?? '',
    description: '',
    deadline: '',
    price: options[0]?.price ?? 0,
  });
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (options.length === 0) return;
    setForm(prev => {
      const stillValid = options.some(o => o.taskType === prev.type);
      const nextType = stillValid ? prev.type : options[0].taskType;
      const nextPrice = options.find(o => o.taskType === nextType)?.price ?? 0;
      if (prev.type === nextType && prev.price === nextPrice) return prev;
      return { ...prev, type: nextType, price: nextPrice };
    });
  }, [options]);

  useEffect(() => {
    if (lockedAssistantId) {
      setForm(f => (f.assistantId === lockedAssistantId ? f : { ...f, assistantId: lockedAssistantId }));
      return;
    }
    if (!form.assistantId && assistants[0]?.id) {
      setForm(f => ({ ...f, assistantId: assistants[0].id }));
    }
  }, [assistants, form.assistantId, lockedAssistantId]);

  const blockedByDifferentAssignee = Boolean(
    lockedAssistantId && form.assistantId && form.assistantId !== lockedAssistantId
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasRegion || !region || blockedByDifferentAssignee || options.length === 0) return;
    try {
      await onAssignTask?.({ ...form, region: JSON.stringify(region), files });
    } catch {
      return;
    }
    setFiles([]);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <form className="flex flex-col h-full" onSubmit={handleSubmit}>
      <div className="px-4 py-3 border-b border-[#3A3A3A]">
        <h3 className="text-sm font-semibold text-white">Giao nhiệm vụ</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Được giao nhiều vùng trên cùng trang cho 1 trợ lí. Không giao song song cho người khác.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {openTaskHint && (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2.5 text-xs text-amber-100 leading-relaxed">
            {openTaskHint}
          </div>
        )}

        <div className="rounded-lg border border-[#3A3A3A] bg-[#242424] p-3 text-xs text-gray-300 space-y-2">
          <p className="font-semibold text-white">Cách chọn vùng</p>
          <ol className="space-y-1 leading-relaxed text-gray-400">
            <li>1. Bấm <span className="text-gray-200">Chọn vùng</span>.</li>
            <li>2. Kéo chuột trực tiếp trên canvas để khoanh vùng.</li>
            <li>3. Thả chuột để chốt vùng.</li>
          </ol>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Loại nhiệm vụ
          </label>
          {options.length === 0 ? (
            <p className="text-xs text-amber-300/90 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2">
              Chưa có bảng giá task cho series này. Vào tab Giá thù lao hoặc nhờ Admin seed giá.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {options.map(opt => (
                <button
                  type="button"
                  key={opt.taskType}
                  onClick={() => setForm(f => ({ ...f, type: opt.taskType, price: opt.price }))}
                  className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 text-left ${
                    form.type === opt.taskType
                      ? getTaskTypeColor(opt.taskType)
                      : 'border-[#4A4A4A] bg-[#3A3A3A] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {opt.displayName?.trim() || getTaskTypeLabel(opt.taskType)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
            <span className="flex items-center gap-1.5"><User size={12} /> Giao cho</span>
          </label>
          <select
            value={form.assistantId}
            onChange={e => setForm(f => ({ ...f, assistantId: e.target.value }))}
            disabled={assistants.length === 0 || Boolean(lockedAssistantId)}
            className="w-full px-3 py-2 text-sm bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white focus:outline-none focus:border-gray-500 disabled:opacity-70"
          >
            {assistants.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {lockedAssistantId && (
            <p className="text-xs text-amber-400/90 mt-2">
              Đang khóa theo trợ lí có task mở trên trang này.
            </p>
          )}
          {assistants.length === 0 && (
            <p className="text-xs text-amber-400 mt-2">
              Hãy thêm trợ lý tại mục Trợ lý trước khi giao nhiệm vụ.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
            <span className="flex items-center gap-1.5"><FileText size={12} /> Hướng dẫn</span>
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Mô tả chi tiết nhiệm vụ…"
            className="w-full px-3 py-2 text-sm bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
              <span className="flex items-center gap-1"><Calendar size={12} /> Hạn chót</span>
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
              <span className="flex items-center gap-1"><Banknote size={12} /> Thù lao (VNĐ)</span>
            </label>
            <div className="px-3 py-2 text-sm bg-[#2A2A2A] border border-[#4A4A4A] rounded-lg text-gray-200 tabular-nums">
              {formatVnd(form.price)}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Theo bảng giá series</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">File tham khảo</label>
          <label className="block border-2 border-dashed border-[#4A4A4A] rounded-lg p-3 text-center hover:border-gray-500 transition-colors cursor-pointer">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={e => {
                setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
            <p className="text-xs text-gray-500">Nhấn để tải lên tài liệu tham khảo</p>
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-xs text-gray-300 bg-[#242424] border border-[#3A3A3A] rounded-md px-2 py-1.5">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-500 hover:text-red-400 shrink-0"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[#3A3A3A]">
        {submitted ? (
          <div className="flex items-center justify-center gap-2 py-2.5 text-green-400 text-sm font-semibold">
            <span>✓</span> Đã giao nhiệm vụ thành công
          </div>
        ) : (
          <button
            type="submit"
            disabled={
              blockedByDifferentAssignee
              || !hasRegion
              || !form.description
              || !form.deadline
              || !form.assistantId
              || options.length === 0
              || isSubmitting
            }
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-[#B81E2E] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Plus size={15} />
            {blockedByDifferentAssignee
              ? 'Chỉ giao cùng 1 người'
              : isSubmitting
                ? 'Đang giao...'
                : 'Giao nhiệm vụ'}
          </button>
        )}
      </div>
    </form>
  );
}
