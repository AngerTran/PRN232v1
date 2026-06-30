import { apiRequest } from './apiClient';
import { getStoredUser } from './authApi';
import { getVisibleSeries } from './seriesApi';
import type { Series } from '../types/domain';

type ApiEnvelope<T> = T | { data: T };

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export interface EditorChapterProgress {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
  deadline?: string | null;
  progressPercent: number;
  pageCount: number;
  completedPages: number;
  pendingTasks: number;
  activeTasks: number;
  doneTasks: number;
  isOverdue: boolean;
}

export interface EditorStudioProgress {
  seriesId: string;
  title: string;
  status: string;
  chapterCount: number;
  totalPages: number;
  completedPages: number;
  totalTasks: number;
  completedTasks: number;
  overdueChapters: number;
  overallProgressPercent: number;
  chapters: EditorChapterProgress[];
}

export interface EditorDefenseNote {
  seriesId: string;
  note?: string | null;
  updatedAt?: string | null;
}

interface ApiEditorChapterProgress {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
  deadline?: string | null;
  progressPercent: number;
  pageCount: number;
  completedPages: number;
  pendingTasks: number;
  activeTasks: number;
  doneTasks: number;
  isOverdue: boolean;
}

interface ApiEditorStudioProgress {
  seriesId: string;
  title: string;
  status: string;
  chapterCount: number;
  totalPages: number;
  completedPages: number;
  totalTasks: number;
  completedTasks: number;
  overdueChapters: number;
  overallProgressPercent: number;
  chapters: ApiEditorChapterProgress[];
}

function mapChapterProgress(item: ApiEditorChapterProgress): EditorChapterProgress {
  return {
    id: item.id,
    chapterNumber: item.chapterNumber,
    title: item.title,
    status: item.status,
    deadline: item.deadline ?? undefined,
    progressPercent: item.progressPercent,
    pageCount: item.pageCount,
    completedPages: item.completedPages,
    pendingTasks: item.pendingTasks,
    activeTasks: item.activeTasks,
    doneTasks: item.doneTasks,
    isOverdue: item.isOverdue,
  };
}

function mapStudioProgress(item: ApiEditorStudioProgress): EditorStudioProgress {
  return {
    seriesId: item.seriesId,
    title: item.title,
    status: item.status,
    chapterCount: item.chapterCount,
    totalPages: item.totalPages,
    completedPages: item.completedPages,
    totalTasks: item.totalTasks,
    completedTasks: item.completedTasks,
    overdueChapters: item.overdueChapters,
    overallProgressPercent: item.overallProgressPercent,
    chapters: item.chapters.map(mapChapterProgress),
  };
}

/** Series editor được phép xem: gán cho editor hiện tại. */
export async function getEditorAssignedSeries(): Promise<Series[]> {
  const user = getStoredUser();
  const items = await getVisibleSeries();
  if (!user || user.role !== 'editor') {
    return items;
  }
  return items.filter(series => series.editorId === user.id);
}

export async function getEditorStudioProgress(seriesId: string): Promise<EditorStudioProgress> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiEditorStudioProgress>>(`/api/series/${seriesId}/studio-progress`)
  );
  return mapStudioProgress(item);
}

export async function getEditorDefenseNote(seriesId: string): Promise<EditorDefenseNote> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<{ seriesId: string; note?: string | null; updatedAt?: string | null }>>(
      `/api/series/${seriesId}/editor-defense-note`
    )
  );
  return {
    seriesId: item.seriesId,
    note: item.note ?? undefined,
    updatedAt: item.updatedAt ?? undefined,
  };
}

export async function saveEditorDefenseNote(seriesId: string, note: string): Promise<EditorDefenseNote> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<{ seriesId: string; note?: string | null; updatedAt?: string | null }>>(
      `/api/series/${seriesId}/editor-defense-note`,
      {
        method: 'PUT',
        body: JSON.stringify({ note }),
      }
    )
  );
  return {
    seriesId: item.seriesId,
    note: item.note ?? undefined,
    updatedAt: item.updatedAt ?? undefined,
  };
}
