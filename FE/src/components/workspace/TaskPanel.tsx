import { useEffect, useState, type FormEvent } from 'react';
import { Target, User, Calendar, DollarSign, FileText, Plus } from 'lucide-react';
import type { TaskType, WorkspaceAssistant } from '../../services/workspaceApi';

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
  onAssignTask?: (data: TaskFormData & { region: string }) => void | Promise<void>;
  assistants: WorkspaceAssistant[];
  isSubmitting?: boolean;
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
  onSelectRegion,
  isSelectingRegion,
  regionLabel,
  onAssignTask,
  assistants,
  isSubmitting = false,
}: TaskPanelProps) {
  const [form, setForm] = useState<TaskFormData>({
    type: 'Background',
    assistantId: assistants[0]?.id ?? '',
    description: '',
    deadline: '',
    price: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!form.assistantId && assistants[0]?.id) {
      setForm(f => ({ ...f, assistantId: assistants[0].id }));
    }
  }, [assistants, form.assistantId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasRegion || !region) return;
    try {
      await onAssignTask?.({ ...form, region: JSON.stringify(region) });
    } catch {
      return;
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <form className="flex flex-col h-full" onSubmit={handleSubmit}>
      <div className="px-4 py-3 border-b border-[#3A3A3A]">
        <h3 className="text-sm font-semibold text-white">Giao nhiệm vụ</h3>
        <p className="text-xs text-gray-400 mt-0.5">Chọn vùng trên canvas, sau đó điền thông tin</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-lg border border-[#3A3A3A] bg-[#242424] p-3 text-xs text-gray-300 space-y-2">
          <p className="font-semibold text-white">Cách chọn vùng</p>
          <ol className="space-y-1 leading-relaxed text-gray-400">
            <li>1. Bấm <span className="text-gray-200">Chọn vùng</span>.</li>
            <li>2. Kéo chuột trực tiếp trên canvas để khoanh vùng.</li>
            <li>3. Thả chuột để chốt vùng.</li>
            <li>4. Kiểm tra JSON vùng bên dưới rồi giao task.</li>
          </ol>
        </div>

        {/* Region selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Vùng đã chọn
          </label>
          <button
            type="button"
            onClick={onSelectRegion}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 ${
              isSelectingRegion
                ? 'border-primary bg-primary/20 text-primary'
                : hasRegion
                ? 'border-green-600 bg-green-900/30 text-green-400'
                : 'border-[#4A4A4A] bg-[#3A3A3A] text-gray-400 hover:border-gray-500'
            }`}
          >
            <Target size={15} />
            <span>
              {isSelectingRegion
                ? 'Nhấn & kéo để chọn…'
                : hasRegion
                ? regionLabel ?? 'Đã chọn vùng'
                : 'Chọn vùng trên canvas'}
            </span>
          </button>
          {region && (
            <div className="mt-2 rounded-lg border border-[#3A3A3A] bg-[#181818] p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">JSONB payload</p>
              <pre className="text-[11px] leading-relaxed text-green-300 font-mono whitespace-pre-wrap break-words">
{JSON.stringify(region, null, 2)}
              </pre>
            </div>
          )}
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
            disabled={assistants.length === 0}
            className="w-full px-3 py-2 text-sm bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white focus:outline-none focus:border-gray-500"
          >
            {assistants.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            {assistants.length === 0 && (
              <option value="">Chưa có assistant từ backend</option>
            )}
          </select>
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
              <span className="flex items-center gap-1"><DollarSign size={12} /> Thù lao (¥)</span>
            </label>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="3500"
              className="w-full px-3 py-2 text-sm bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>

        {/* Resource upload */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">File tham khảo</label>
          <div className="border-2 border-dashed border-[#4A4A4A] rounded-lg p-3 text-center hover:border-gray-500 transition-colors cursor-pointer">
            <input type="file" multiple className="sr-only" />
            <p className="text-xs text-gray-500">Nhấn để tải lên tài liệu tham khảo</p>
          </div>
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
            disabled={!hasRegion || !form.description || !form.deadline || !form.assistantId || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-[#B81E2E] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Plus size={15} />
            {isSubmitting ? 'Đang giao...' : 'Giao nhiệm vụ'}
          </button>
        )}
      </div>
    </form>
  );
}
