/** Fallback labels khi chưa tải catalog từ API. Khớp DAL.Common.TaskTypes. */

export const TASK_TYPE_ORDER = [
  'background',
  'shading',
  'effects',
  'other',
  'cleanup',
  'lineart',
  'speech_bubble',
] as const;

export type ApiTaskType = (typeof TASK_TYPE_ORDER)[number];

export const TASK_TYPE_LABELS: Record<string, string> = {
  background: 'Nền',
  shading: 'Bóng đổ',
  effects: 'Hiệu ứng',
  other: 'Screentone',
  cleanup: 'Nét sạch',
  lineart: 'Lineart',
  speech_bubble: 'Sửa hội thoại',
  Background: 'Nền',
  Shading: 'Bóng đổ',
  Effect: 'Hiệu ứng',
  Screentone: 'Screentone',
  'Clean Line': 'Nét sạch',
  'Dialogue Edit': 'Sửa hội thoại',
  Lineart: 'Lineart',
};

export const TASK_TYPE_COLORS: Record<string, string> = {
  background: 'bg-blue-100 text-blue-700 border-blue-300',
  shading: 'bg-purple-100 text-purple-700 border-purple-300',
  effects: 'bg-orange-100 text-orange-700 border-orange-300',
  other: 'bg-teal-100 text-teal-700 border-teal-300',
  cleanup: 'bg-gray-100 text-gray-700 border-gray-300',
  lineart: 'bg-slate-100 text-slate-700 border-slate-300',
  speech_bubble: 'bg-pink-100 text-pink-700 border-pink-300',
  Background: 'bg-blue-100 text-blue-700 border-blue-300',
  Shading: 'bg-purple-100 text-purple-700 border-purple-300',
  Effect: 'bg-orange-100 text-orange-700 border-orange-300',
  Screentone: 'bg-teal-100 text-teal-700 border-teal-300',
  'Clean Line': 'bg-gray-100 text-gray-700 border-gray-300',
  'Dialogue Edit': 'bg-pink-100 text-pink-700 border-pink-300',
  Lineart: 'bg-slate-100 text-slate-700 border-slate-300',
};

const LEGACY_UI_TO_API: Record<string, string> = {
  Background: 'background',
  Shading: 'shading',
  Effect: 'effects',
  Screentone: 'other',
  'Clean Line': 'cleanup',
  'Dialogue Edit': 'speech_bubble',
  Lineart: 'lineart',
};

/** Runtime label overrides từ API catalog. */
const runtimeLabels: Record<string, string> = {};

export function setTaskTypeLabelsFromCatalog(
  items: { taskType: string; displayName?: string }[]
): void {
  for (const key of Object.keys(runtimeLabels)) {
    delete runtimeLabels[key];
  }
  for (const item of items) {
    const type = normalizeTaskType(item.taskType);
    if (item.displayName?.trim()) {
      runtimeLabels[type] = item.displayName.trim();
    }
  }
}

export function normalizeTaskType(value?: string | null): string {
  if (!value) return 'background';
  const trimmed = value.trim();
  if (LEGACY_UI_TO_API[trimmed]) return LEGACY_UI_TO_API[trimmed];
  return trimmed.toLowerCase();
}

export function getTaskTypeLabel(value?: string | null): string {
  if (!value) return 'Nền';
  const key = normalizeTaskType(value);
  return (
    runtimeLabels[key]
    ?? TASK_TYPE_LABELS[value]
    ?? TASK_TYPE_LABELS[key]
    ?? value
  );
}

export function getTaskTypeColor(value?: string | null): string {
  if (!value) return TASK_TYPE_COLORS.background;
  const key = normalizeTaskType(value);
  return (
    TASK_TYPE_COLORS[value]
    ?? TASK_TYPE_COLORS[key]
    ?? 'bg-indigo-100 text-indigo-700 border-indigo-300'
  );
}

export function sortTaskTypeItems<T extends { taskType: string; sortOrder?: number }>(items: T[]): T[] {
  const order = new Map(TASK_TYPE_ORDER.map((k, i) => [k, (i + 1) * 10]));
  return [...items].sort((a, b) => {
    const ai = a.sortOrder ?? order.get(normalizeTaskType(a.taskType)) ?? 999;
    const bi = b.sortOrder ?? order.get(normalizeTaskType(b.taskType)) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.taskType.localeCompare(b.taskType);
  });
}
