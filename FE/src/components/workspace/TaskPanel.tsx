import { useEffect, useState, type FormEvent } from 'react';
import { User, Calendar, Banknote, FileText, Plus } from 'lucide-react';
import type { TaskType, WorkspaceAssistant } from '../../services/workspaceApi';
import { formatVndInput } from '../../utils/formatCurrency';

const TASK_TYPES: TaskType[] = ['Background', 'Shading', 'Effect', 'Screentone', 'Clean Line', 'Dialogue Edit'];

const TYPE_LABELS: Record<TaskType, string> = {
  'Background': 'Nền',
  'Shading': 'Bóng đổ',
  'Effect': 'Hiệu ứng',
  'Screentone': 'Screentone',
  'Clean Line': 'Nét sạch',
  'Dialogue Edit': 'Sửa hội thoại',
};

const TYPE_COLORS: Record<TaskType, string> = {
  'Background': 'bg-blue-100 text-blue-700 border-blue-300',
  'Shading': 'bg-purple-100 text-purple-700 border-purple-300',
  'Effect': 'bg-orange-100 text-orange-700 border-orange-300',
  'Screentone': 'bg-teal-100 text-teal-700 border-teal-300',
  'Clean Line': 'bg-gray-100 text-gray-700 border-gray-300',
  'Dialogue Edit': 'bg-pink-100 text-pink-700 border-pink-300',
};

interface TaskPanelProps {
  hasRegion: boolean;
  region?: { x: number; y: number; width: number; height: number } | null;
  onSelectRegion: () => void;
  isSelectingRegion: boolean;
  regionLabel?: string;
  onAssignTask?: (data: TaskFormData & { region: string; files: File[] }) => void | Promise<void>;
  assistants: WorkspaceAssistant[];
  isSubmitting?: boolean;
  /** Nếu trang đang có task mở — chỉ được giao thêm cho cùng trợ lí này. */
  lockedAssistantId?: string;
  openTaskHint?: string;
}

export interface TaskFormData {
  type: TaskType;
  assistantId: string;
  description: string;
  deadline: string;
  price: string;
}

export default function TaskPanel({
  hasRegion,
  region,
  onAssignTask,
  assistants,
  isSubmitting = false,
  lockedAssistantId,
  openTaskHint,
}: TaskPanelProps) {
  const [form, setForm] = useState<TaskFormData>({
    type: 'Background',
    assistantId: lockedAssistantId ?? assistants[0]?.id ?? '',
    description: '',
    deadline: '',
    price: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

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
    if (!hasRegion || !region || blockedByDifferentAssignee) return;
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

        {/* Task type */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Loại nhiệm vụ
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TASK_TYPES.map(type => (
              <button
                type="button"
                key={type}
                onClick={() => setForm(f => ({ ...f, type }))}
                className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 text-left ${
                  form.type === type
                    ? TYPE_COLORS[type]
                    : 'border-[#4A4A4A] bg-[#3A3A3A] text-gray-400 hover:border-gray-500'
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Assistant */}
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
            {assistants.length === 0 && (
              <option value="">Chưa có trợ lý trong studio</option>
            )}
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

        {/* Description */}
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

        {/* Deadline + Price row */}
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
            <input
              type="text"
              inputMode="numeric"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: formatVndInput(e.target.value) }))}
              placeholder="50.000"
              className="w-full px-3 py-2 text-sm bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-gray-500 tabular-nums"
            />
          </div>
        </div>

        {/* Resource upload */}
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

      {/* Submit */}
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
