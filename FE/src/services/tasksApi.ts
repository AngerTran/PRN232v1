import { apiRequest } from './apiClient';
import { fromApiTaskType } from './workspaceApi';
import { getMySeries, getSeriesChapters } from './seriesApi';
import type { Task, TaskStatus } from '../types/domain';

type ApiEnvelope<T> = T | { data: T };

interface ApiTask {
  id: string;
  pageId: string;
  taskType: string;
  status: string;
  title?: string | null;
  description?: string | null;
  region: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  deadline?: string | null;
  createdAt?: string | null;
  resourceUrls?: string[] | null;
  price?: number | null;
  paymentStatus?: string | null;
}

interface ApiPage {
  id: string;
  chapterId: string;
  pageNumber: number;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}

interface ApiChapter {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
}

interface ApiSeries {
  id: string;
  title: string;
}

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export function mapApiTaskStatus(status: string): TaskStatus {
  switch (status?.toLowerCase()) {
    case 'in_progress':
      return 'In Progress';
    case 'submitted':
      return 'Submitted';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Revision Required';
    case 'todo':
    default:
      return 'Pending';
  }
}

function parseRegion(region: string): Task['region'] {
  try {
    const parsed = JSON.parse(region) as Partial<Task['region']>;
    return {
      x: Number(parsed.x) || 0,
      y: Number(parsed.y) || 0,
      width: Number(parsed.width) || 0,
      height: Number(parsed.height) || 0,
    };
  } catch {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

// Cache theo từng lần gọi để tránh gọi trùng page/chapter/series khi enrich nhiều task.
class EnrichCache {
  private pages = new Map<string, Promise<ApiPage | undefined>>();
  private chapters = new Map<string, Promise<ApiChapter | undefined>>();
  private series = new Map<string, Promise<ApiSeries | undefined>>();

  page(id: string) {
    if (!this.pages.has(id)) {
      this.pages.set(
        id,
        apiRequest<ApiEnvelope<ApiPage>>(`/api/pages/${id}`).then(unwrap).catch(() => undefined)
      );
    }
    return this.pages.get(id)!;
  }

  chapter(id: string) {
    if (!this.chapters.has(id)) {
      this.chapters.set(
        id,
        apiRequest<ApiEnvelope<ApiChapter>>(`/api/chapters/${id}`).then(unwrap).catch(() => undefined)
      );
    }
    return this.chapters.get(id)!;
  }

  seriesById(id: string) {
    if (!this.series.has(id)) {
      this.series.set(
        id,
        apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}`).then(unwrap).catch(() => undefined)
      );
    }
    return this.series.get(id)!;
  }
}

async function enrichTask(task: ApiTask, cache: EnrichCache): Promise<Task> {
  const page = await cache.page(task.pageId);
  const chapter = page ? await cache.chapter(page.chapterId) : undefined;
  const series = chapter ? await cache.seriesById(chapter.seriesId) : undefined;
  const type = fromApiTaskType(task.taskType);

  return {
    id: task.id,
    pageId: task.pageId,
    chapterId: page?.chapterId ?? '',
    seriesId: chapter?.seriesId ?? '',
    seriesTitle: series?.title ?? '',
    chapterTitle: chapter?.title || (chapter ? `Chapter ${chapter.chapterNumber}` : ''),
    pageNumber: page?.pageNumber ?? 0,
    title: task.title || `${type}: Trang ${page?.pageNumber ?? ''}`.trim(),
    type,
    assistantId: task.assignedTo ?? '',
    description: task.description ?? '',
    deadline: task.deadline?.slice(0, 10) ?? '',
    price: Number(task.price) || 0,
    status: mapApiTaskStatus(task.status),
    region: parseRegion(task.region),
    createdAt: task.createdAt?.slice(0, 10) ?? '',
    resourceUrls: task.resourceUrls ?? [],
    assignedByName: task.assignedByName ?? '',
    pageImageUrl: page?.imageUrl ?? page?.thumbnailUrl ?? '',
    paymentStatus: task.paymentStatus ?? null,
  };
}

export async function getMyTasks(): Promise<Task[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiTask[]>>('/api/tasks/my'));
  const cache = new EnrichCache();
  return Promise.all(items.map(item => enrichTask(item, cache)));
}

export async function getTask(taskId: string): Promise<Task> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiTask>>(`/api/tasks/${taskId}`));
  return enrichTask(item, new EnrichCache());
}

interface ApiKanbanColumnItem {
  id: string;
}

interface ApiKanban {
  todo: ApiKanbanColumnItem[];
  doing: ApiKanbanColumnItem[];
  done: ApiKanbanColumnItem[];
}

/**
 * Gộp toàn bộ task của mangaka: series → chapters → kanban (lấy id) → chi tiết task.
 * BE không có endpoint "tất cả task của mangaka" nên phải tổng hợp.
 */
export async function getMangakaTasks(): Promise<Task[]> {
  const series = await getMySeries();
  const chapterLists = await Promise.all(series.map(s => getSeriesChapters(s.id).catch(() => [])));
  const chapters = chapterLists.flat();

  const kanbans = await Promise.all(
    chapters.map(c =>
      apiRequest<ApiEnvelope<ApiKanban>>(`/api/chapters/${c.id}/kanban`).then(unwrap).catch(() => null)
    )
  );

  const taskIds: string[] = [];
  for (const k of kanbans) {
    if (!k) continue;
    for (const col of [...(k.todo ?? []), ...(k.doing ?? []), ...(k.done ?? [])]) {
      taskIds.push(col.id);
    }
  }

  const cache = new EnrichCache();
  const tasks = await Promise.all(
    taskIds.map(async id => {
      const item = await apiRequest<ApiEnvelope<ApiTask>>(`/api/tasks/${id}`).then(unwrap).catch(() => null);
      return item ? enrichTask(item, cache) : null;
    })
  );
  return tasks.filter((t): t is Task => t !== null);
}

export async function startTask(taskId: string): Promise<Task> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiTask>>(`/api/tasks/${taskId}/status_in_progress`, {
    method: 'PATCH',
  }));
  return enrichTask(item, new EnrichCache());
}
