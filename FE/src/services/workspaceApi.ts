import { apiRequest } from './apiClient';

export type PageStatus = 'Draft' | 'In Progress' | 'Completed' | 'Approved' | string;
export type TaskType = 'Background' | 'Shading' | 'Effect' | 'Screentone' | 'Clean Line' | 'Dialogue Edit';
export type TaskStatus = 'Pending' | 'In Progress' | 'Submitted' | 'Approved' | 'Revision Required' | string;

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceAssistant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  specialties?: string[];
}

export interface WorkspaceChapter {
  id: string;
  seriesId?: string;
  number?: number;
  title: string;
}

export interface WorkspacePageItem {
  id: string;
  chapterId: string;
  pageNumber: number;
  status: PageStatus;
  thumbnailUrl?: string;
  tasksCount?: number;
  completedTasksCount?: number;
  panelLayout?: number;
}

export interface WorkspaceTask {
  id: string;
  pageId: string;
  chapterId?: string;
  seriesId?: string;
  seriesTitle?: string;
  chapterTitle?: string;
  pageNumber?: number;
  title: string;
  type: TaskType;
  assistantId: string;
  assistantName?: string;
  description: string;
  deadline: string;
  price: number;
  status: TaskStatus;
  region: Region;
  submittedResult?: string;
  mangakaFeedback?: string;
  createdAt?: string;
}

export interface WorkspacePayload {
  page: WorkspacePageItem;
  chapter?: WorkspaceChapter;
  pages: WorkspacePageItem[];
  tasks: WorkspaceTask[];
  assistants: WorkspaceAssistant[];
}

export interface CreateWorkspaceTaskInput {
  pageId: string;
  type: TaskType;
  assistantId: string;
  description: string;
  deadline: string;
  price: number;
  region: Region;
}

type ApiEnvelope<T> = T | { data: T };

interface ApiPage {
  id: string;
  chapterId: string;
  pageNumber: number;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  status: string;
  width?: number | null;
  height?: number | null;
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

interface ApiProfile {
  id: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

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
  deadline?: string | null;
  createdAt?: string | null;
}

interface ApiKanbanItem {
  id: string;
  pageId: string;
}

interface ApiKanban {
  todo?: ApiKanbanItem[];
  doing?: ApiKanbanItem[];
  done?: ApiKanbanItem[];
}

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

function normalizeRegion(region: Region | string): Region {
  if (typeof region === 'string') {
    return JSON.parse(region) as Region;
  }
  return region;
}

function mapPageStatus(status: string): PageStatus {
  switch (status?.toLowerCase()) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'approved':
      return 'Approved';
    case 'draft':
    default:
      return 'Draft';
  }
}

function mapTaskStatus(status: string): TaskStatus {
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

function mapPage(page: ApiPage): WorkspacePageItem {
  return {
    id: page.id,
    chapterId: page.chapterId,
    pageNumber: page.pageNumber,
    status: mapPageStatus(page.status),
    thumbnailUrl: page.thumbnailUrl ?? page.imageUrl ?? undefined,
    tasksCount: 0,
    completedTasksCount: 0,
    panelLayout: (page.pageNumber - 1) % 4,
  };
}

function mapChapter(chapter: ApiChapter): WorkspaceChapter {
  return {
    id: chapter.id,
    seriesId: chapter.seriesId,
    number: chapter.chapterNumber,
    title: chapter.title || `Chapter ${chapter.chapterNumber}`,
  };
}

function mapAssistant(profile: ApiProfile): WorkspaceAssistant {
  return {
    id: profile.id,
    name: profile.fullName || profile.email || 'Assistant',
    email: profile.email ?? undefined,
    avatar: profile.avatarUrl ?? undefined,
  };
}

function mapTask(
  task: ApiTask,
  page?: WorkspacePageItem,
  chapter?: WorkspaceChapter,
  series?: ApiSeries
): WorkspaceTask {
  const type = task.taskType as TaskType;
  return {
    id: task.id,
    pageId: task.pageId,
    chapterId: page?.chapterId ?? chapter?.id,
    seriesId: chapter?.seriesId,
    seriesTitle: series?.title,
    chapterTitle: chapter?.title,
    pageNumber: page?.pageNumber,
    title: task.title || `${type}: Page ${page?.pageNumber ?? ''}`.trim(),
    type,
    assistantId: task.assignedTo ?? '',
    assistantName: task.assignedToName ?? undefined,
    description: task.description ?? '',
    deadline: task.deadline?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    price: 0,
    status: mapTaskStatus(task.status),
    region: normalizeRegion(task.region),
    createdAt: task.createdAt?.slice(0, 10),
  };
}

function normalizeTask(task: WorkspaceTask): WorkspaceTask {
  return {
    ...task,
    region: normalizeRegion(task.region),
    price: Number(task.price) || 0,
  };
}

export async function getWorkspace(pageId: string): Promise<WorkspacePayload> {
  const apiPage = unwrap(await apiRequest<ApiEnvelope<ApiPage>>(`/api/pages/${pageId}`));
  const page = mapPage(apiPage);
  const [apiChapter, apiPages, apiProfiles] = await Promise.all([
    apiRequest<ApiEnvelope<ApiChapter>>(`/api/chapters/${page.chapterId}`).then(unwrap),
    apiRequest<ApiEnvelope<ApiPage[]>>(`/api/chapters/${page.chapterId}/pages`).then(unwrap),
    apiRequest<ApiEnvelope<ApiProfile[]>>('/api/profiles/assistants').then(unwrap),
  ]);

  const chapter = mapChapter(apiChapter);
  const pages = apiPages.map(mapPage);
  const pageById = new Map(pages.map(item => [item.id, item]));
  const [series, kanban] = await Promise.all([
    chapter.seriesId
      ? apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${chapter.seriesId}`).then(unwrap).catch(() => undefined)
      : Promise.resolve(undefined),
    apiRequest<ApiEnvelope<ApiKanban>>(`/api/chapters/${page.chapterId}/kanban`).then(unwrap).catch(() => undefined),
  ]);

  const kanbanItems = [
    ...(kanban?.todo ?? []),
    ...(kanban?.doing ?? []),
    ...(kanban?.done ?? []),
  ];

  const apiTasks = await Promise.all(
    kanbanItems.map(item => apiRequest<ApiEnvelope<ApiTask>>(`/api/tasks/${item.id}`).then(unwrap))
  );

  const allTasks = apiTasks.map(task => mapTask(task, pageById.get(task.pageId), chapter, series));
  const tasks = allTasks.filter(task => task.pageId === pageId);
  const taskCounts = new Map<string, { total: number; completed: number }>();
  allTasks.forEach(task => {
    const count = taskCounts.get(task.pageId) ?? { total: 0, completed: 0 };
    count.total += 1;
    if (task.status === 'Approved') count.completed += 1;
    taskCounts.set(task.pageId, count);
  });

  return {
    page: pageById.get(pageId) ?? page,
    chapter,
    pages: pages.map(item => ({
      ...item,
      tasksCount: taskCounts.get(item.id)?.total ?? 0,
      completedTasksCount: taskCounts.get(item.id)?.completed ?? 0,
    })),
    tasks,
    assistants: apiProfiles.map(mapAssistant),
  };
}

export async function createWorkspaceTask(input: CreateWorkspaceTaskInput): Promise<WorkspaceTask> {
  const task = unwrap(await apiRequest<ApiEnvelope<ApiTask>>(`/api/pages/${input.pageId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      taskType: input.type,
      assignedTo: input.assistantId,
      title: `${input.type}: Page area`,
      description: input.description,
      deadline: input.deadline,
      region: JSON.stringify(input.region),
    }),
  }));

  return normalizeTask(mapTask(task));
}

export async function getChapterPages(chapterId: string): Promise<WorkspacePageItem[]> {
  const pages = unwrap(await apiRequest<ApiEnvelope<ApiPage[]>>(`/api/chapters/${chapterId}/pages`));
  return pages.map(mapPage);
}
