import { apiRequest, API_BASE_URL } from './apiClient';
import { getChapterTaskStats } from './workspaceApi';
import type { Chapter, ChapterStatus, Series, SeriesRanking, SeriesStatus } from '../data/mockData';

type ApiEnvelope<T> = T | { data: T };

interface ApiSeries {
  id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  targetAudience?: string | null;
  coverImageUrl?: string | null;
  authorId: string;
  authorName?: string | null;
  editorId?: string | null;
  editorName?: string | null;
  status: string;
  publishingFrequency?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ApiChapter {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
  manuscriptUrl?: string | null;
  status: string;
  deadline?: string | null;
  releaseDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateSeriesInput {
  title: string;
  description?: string;
  genre?: string;
  targetAudience?: string;
  coverImageUrl?: string;
  publishingFrequency?: string;
}

export interface CreateChapterInput {
  seriesId: string;
  chapterNumber: number;
  title?: string;
  manuscriptUrl?: string;
  deadline?: string;
}

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

function mapSeriesStatus(status: string): SeriesStatus {
  switch (status?.toLowerCase()) {
    case 'pending_review':
      return 'Submitted';
    case 'approved':
      return 'Approved';
    case 'publishing':
      return 'In Progress';
    case 'hiatus':
      return 'At Risk';
    case 'cancelled':
      return 'Cancelled';
    case 'completed':
      return 'Published';
    case 'draft':
    default:
      return 'Draft';
  }
}

function mapChapterStatus(status: string): ChapterStatus {
  switch (status?.toLowerCase()) {
    case 'in_progress':
      return 'In Progress';
    case 'reviewing':
      return 'Review';
    case 'completed':
      return 'Approved';
    case 'published':
      return 'Published';
    case 'draft':
    default:
      return 'Draft';
  }
}

function mapPublishingFrequency(frequency?: string | null): Series['publishingType'] {
  return frequency?.toLowerCase() === 'monthly' ? 'Monthly' : 'Weekly';
}

function toApiPublishingFrequency(value?: string): string | undefined {
  if (!value) return undefined;
  return value.toLowerCase().includes('month') || value.toLowerCase().includes('thang') ? 'monthly' : 'weekly';
}

function toApiDateTime(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.includes('T') || value.includes('Z')) return value;
  return `${value}T00:00:00Z`;
}

function dateOnly(value?: string | null): string {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

const CHARACTERS_MARKER = '\n\n---NHAN-VAT-CHINH---\n';

/** Ghép tóm tắt và nhân vật chính vào trường description của backend. */
export function buildSeriesDescription(synopsis: string, mainCharacters?: string): string {
  const base = synopsis.trim();
  const chars = mainCharacters?.trim();
  if (!chars) return base;
  return `${base}${CHARACTERS_MARKER}${chars}`;
}

/** Tách synopsis và nhân vật chính từ description backend. */
export function parseSeriesDescription(description?: string | null): { synopsis: string; mainCharacters: string } {
  if (!description) return { synopsis: '', mainCharacters: '' };
  const marker = '---NHAN-VAT-CHINH---';
  const idx = description.indexOf(marker);
  if (idx === -1) return { synopsis: description.trim(), mainCharacters: '' };
  return {
    synopsis: description.slice(0, idx).trim(),
    mainCharacters: description.slice(idx + marker.length).trim(),
  };
}

export function mapSeries(item: ApiSeries, chaptersCount = 0): Series {
  const genre = item.genre || 'Uncategorized';
  const { synopsis, mainCharacters } = parseSeriesDescription(item.description);
  return {
    id: item.id,
    title: item.title,
    genre,
    genres: genre.split(',').map(g => g.trim()).filter(Boolean),
    status: mapSeriesStatus(item.status),
    synopsis,
    mainCharacters: mainCharacters || undefined,
    targetAudience: item.targetAudience || '',
    publishingType: mapPublishingFrequency(item.publishingFrequency),
    currentRank: 0,
    previousRank: 0,
    voteScore: 0,
    chaptersCount,
    coverUrl: item.coverImageUrl || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=560&fit=crop',
    mangakaId: item.authorId,
    mangakaName: item.authorName ?? undefined,
    createdAt: dateOnly(item.createdAt),
    updatedAt: dateOnly(item.updatedAt),
    isAtRisk: item.status?.toLowerCase() === 'hiatus',
  };
}

export function mapChapter(item: ApiChapter): Chapter {
  return {
    id: item.id,
    seriesId: item.seriesId,
    number: item.chapterNumber,
    title: item.title || `Chapter ${item.chapterNumber}`,
    deadline: dateOnly(item.deadline),
    progress: mapChapterStatus(item.status) === 'Published' ? 100 : 0,
    status: mapChapterStatus(item.status),
    pagesCount: 0,
    description: item.manuscriptUrl || '',
    createdAt: dateOnly(item.createdAt),
  };
}

async function enrichChapter(chapter: Chapter): Promise<Chapter> {
  try {
    const stats = await getChapterTaskStats(chapter.id);
    const progress = stats.progress > 0
      ? stats.progress
      : (chapter.status === 'Published' ? 100 : 0);

    // Suy ra trạng thái hiển thị theo tiến độ task (workflow backend vẫn giữ nguyên).
    let status = chapter.status;
    if (chapter.status === 'Draft' || chapter.status === 'In Progress') {
      if (stats.totalTasks > 0 && progress === 100) status = 'Approved';
      else if (stats.totalTasks > 0 && progress > 0) status = 'In Progress';
    }

    return { ...chapter, pagesCount: stats.pagesCount, progress, status };
  } catch {
    return chapter;
  }
}

export async function getMySeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series/my-series'));
  return Promise.all(items.map(async item => {
    const chapters = await getSeriesChapters(item.id).catch(() => []);
    return mapSeries(item, chapters.length);
  }));
}

export async function getVisibleSeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series'));
  return Promise.all(items.map(async item => {
    const chapters = await getSeriesChapters(item.id).catch(() => []);
    return mapSeries(item, chapters.length);
  }));
}

const APPROVED_SERIES_STATUSES = new Set(['approved', 'publishing', 'completed']);

/** Series đã qua hội đồng (approved trở đi), không tải chapter để nhẹ hơn. */
export async function getApprovedSeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series'));
  return items
    .filter(item => APPROVED_SERIES_STATUSES.has(item.status?.toLowerCase() ?? ''))
    .map(item => mapSeries(item));
}

export async function getSeries(id: string): Promise<Series> {
  const [item, chapters] = await Promise.all([
    apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}`).then(unwrap),
    getSeriesChapters(id).catch(() => []),
  ]);
  return mapSeries(item, chapters.length);
}

export async function getSeriesChapters(id: string): Promise<Chapter[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiChapter[]>>(`/api/series/${id}/chapters`));
  const chapters = items.map(mapChapter);
  return Promise.all(chapters.map(enrichChapter));
}

export async function getChapter(id: string): Promise<Chapter> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiChapter>>(`/api/chapters/${id}`));
  return enrichChapter(mapChapter(item));
}

export async function createSeries(input: CreateSeriesInput): Promise<Series> {
  const created = unwrap(await apiRequest<ApiEnvelope<ApiSeries>>('/api/series', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      genre: input.genre,
      targetAudience: input.targetAudience,
      coverImageUrl: input.coverImageUrl,
      publishingFrequency: toApiPublishingFrequency(input.publishingFrequency),
    }),
  }));
  return mapSeries(created);
}

/** Tải ảnh bìa lên Supabase Storage và cập nhật URL trên series. */
export async function uploadSeriesCover(seriesId: string, file: File): Promise<Series> {
  const form = new FormData();
  form.append('file', file);

  const token = localStorage.getItem('inkflow_access_token');
  const response = await fetch(`${API_BASE_URL}/api/series/${seriesId}/cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; title?: string };
      message = parsed.message || parsed.title || body;
    } catch {
      // giữ nguyên text
    }
    throw new Error(message || `Tải ảnh bìa thất bại (status ${response.status})`);
  }

  return mapSeries(unwrap(await response.json()));
}

/** Tải bản thảo lên chapter (PDF/ZIP/CBZ). */
export async function uploadChapterManuscript(chapterId: string, file: File): Promise<Chapter> {
  const form = new FormData();
  form.append('file', file);

  const token = localStorage.getItem('inkflow_access_token');
  const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/manuscript`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; title?: string };
      message = parsed.message || parsed.title || body;
    } catch {
      // giữ nguyên text
    }
    throw new Error(message || `Tải bản thảo thất bại (status ${response.status})`);
  }

  const item = unwrap(await response.json()) as ApiChapter;
  return mapChapter(item);
}

/** Tạo chapter bản thảo đề xuất (số 0) và upload file nếu có. */
export async function uploadSeriesProposalManuscript(seriesId: string, file: File): Promise<Chapter> {
  const chapter = await createChapter({
    seriesId,
    chapterNumber: 0,
    title: 'Bản thảo đề xuất',
  });
  return uploadChapterManuscript(chapter.id, file);
}

export async function createChapter(input: CreateChapterInput): Promise<Chapter> {
  const created = unwrap(await apiRequest<ApiEnvelope<ApiChapter>>(`/api/series/${input.seriesId}/chapters`, {
    method: 'POST',
    body: JSON.stringify({
      chapterNumber: input.chapterNumber,
      title: input.title,
      manuscriptUrl: input.manuscriptUrl,
      deadline: toApiDateTime(input.deadline),
    }),
  }));
  return mapChapter(created);
}

export async function updateSeriesStatus(id: string, status: string): Promise<Series> {
  const updated = unwrap(await apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }));
  return mapSeries(updated);
}

/** Gửi series lên hội đồng xét duyệt (draft → pending_review). */
export async function submitSeriesForReview(id: string): Promise<Series> {
  return updateSeriesStatus(id, 'pending_review');
}

export async function deleteSeries(id: string): Promise<void> {
  await apiRequest<void>(`/api/series/${id}`, { method: 'DELETE' });
}

export async function updateChapterStatus(id: string, status: string): Promise<Chapter> {
  const updated = unwrap(await apiRequest<ApiEnvelope<ApiChapter>>(`/api/chapters/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }));
  return mapChapter(updated);
}

export async function deleteChapter(id: string): Promise<void> {
  await apiRequest<void>(`/api/chapters/${id}`, { method: 'DELETE' });
}

export interface SeriesRankingItem {
  seriesId: string;
  title: string;
  status: string;
  issueNumber: number;
  rankPosition: number;
  voteCount: number;
  popularityScore: number;
  rankedAt?: string;
}

interface ApiSeriesRankingItem {
  seriesId: string;
  title: string;
  status: string;
  issueNumber: number;
  rankPosition: number;
  voteCount?: number | null;
  popularityScore?: number | null;
  rankedAt?: string | null;
}

function mapRankingItem(item: ApiSeriesRankingItem): SeriesRankingItem {
  return {
    seriesId: item.seriesId,
    title: item.title,
    status: item.status,
    issueNumber: item.issueNumber,
    rankPosition: item.rankPosition,
    voteCount: item.voteCount ?? 0,
    popularityScore: Number(item.popularityScore ?? 0),
    rankedAt: item.rankedAt ?? undefined,
  };
}

export async function getSeriesRanking(): Promise<SeriesRankingItem[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeriesRankingItem[]>>('/api/series/ranking'));
  return items.map(mapRankingItem);
}

export interface SeriesStats {
  seriesId: string;
  title: string;
  status: string;
  chapterCount: number;
  pageCount: number;
  latestRanking: SeriesRankingItem | null;
  boardVoteCount: number;
  approveVotes: number;
  rejectVotes: number;
  scheduleCount: number;
  inDangerZone: boolean;
}

interface ApiSeriesStats {
  seriesId: string;
  title: string;
  status: string;
  chapterCount: number;
  pageCount: number;
  latestRanking?: ApiSeriesRankingItem | null;
  boardVoteCount: number;
  approveVotes: number;
  rejectVotes: number;
  scheduleCount: number;
  inDangerZone: boolean;
}

export async function getSeriesStats(id: string): Promise<SeriesStats> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiSeriesStats>>(`/api/series/${id}/stats`));
  return {
    seriesId: item.seriesId,
    title: item.title,
    status: item.status,
    chapterCount: item.chapterCount,
    pageCount: item.pageCount,
    latestRanking: item.latestRanking ? mapRankingItem(item.latestRanking) : null,
    boardVoteCount: item.boardVoteCount,
    approveVotes: item.approveVotes,
    rejectVotes: item.rejectVotes,
    scheduleCount: item.scheduleCount,
    inDangerZone: item.inDangerZone,
  };
}

export interface RankingIssue {
  id: string;
  seriesId: string;
  issueNumber: number;
  rankPosition: number;
  voteCount: number;
  popularityScore: number;
  createdAt?: string;
}

interface ApiRankingHistory {
  seriesId: string;
  seriesTitle?: string | null;
  issues: Array<{
    id: string;
    seriesId: string;
    seriesTitle?: string | null;
    issueNumber: number;
    rankPosition: number;
    voteCount?: number | null;
    popularityScore?: number | null;
    createdAt?: string | null;
  }>;
}

export async function getRankingHistory(seriesId: string): Promise<RankingIssue[]> {
  const result = unwrap(
    await apiRequest<ApiEnvelope<ApiRankingHistory>>(`/api/rankings/history?seriesId=${seriesId}`)
  );
  return (result.issues ?? []).map(issue => ({
    id: issue.id,
    seriesId: issue.seriesId,
    issueNumber: issue.issueNumber,
    rankPosition: issue.rankPosition,
    voteCount: issue.voteCount ?? 0,
    popularityScore: Number(issue.popularityScore ?? 0),
    createdAt: issue.createdAt ?? undefined,
  }));
}

export interface PublishingScheduleItem {
  id: string;
  seriesId?: string;
  publishDate: string;
  frequency: string;
  issueNumber?: number;
  notes?: string;
  createdAt?: string;
}

interface ApiSchedule {
  id: string;
  seriesId?: string | null;
  publishDate: string;
  frequency: string;
  issueNumber?: number | null;
  notes?: string | null;
  createdAt?: string | null;
}

function mapSchedule(item: ApiSchedule): PublishingScheduleItem {
  return {
    id: item.id,
    seriesId: item.seriesId ?? undefined,
    publishDate: item.publishDate,
    frequency: item.frequency,
    issueNumber: item.issueNumber ?? undefined,
    notes: item.notes ?? undefined,
    createdAt: item.createdAt ?? undefined,
  };
}

export async function getSeriesSchedules(seriesId: string): Promise<PublishingScheduleItem[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSchedule[]>>(`/api/series/${seriesId}/schedules`));
  return items.map(mapSchedule);
}

export interface CreateScheduleInput {
  publishDate: string;
  frequency: string;
  issueNumber?: number;
  notes?: string;
}

export async function createSchedule(seriesId: string, input: CreateScheduleInput): Promise<PublishingScheduleItem> {
  const created = unwrap(
    await apiRequest<ApiEnvelope<ApiSchedule>>(`/api/series/${seriesId}/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        publishDate: input.publishDate,
        frequency: input.frequency,
        issueNumber: input.issueNumber,
        notes: input.notes,
      }),
    })
  );
  return mapSchedule(created);
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiRequest<void>(`/api/schedules/${id}`, { method: 'DELETE' });
}

export interface UpdateScheduleInput {
  publishDate?: string;
  frequency?: string;
  issueNumber?: number;
  notes?: string;
}

export async function updateSchedule(id: string, input: UpdateScheduleInput): Promise<PublishingScheduleItem> {
  const updated = unwrap(
    await apiRequest<ApiEnvelope<ApiSchedule>>(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        publishDate: input.publishDate,
        frequency: input.frequency,
        issueNumber: input.issueNumber,
        notes: input.notes,
      }),
    })
  );
  return mapSchedule(updated);
}

// Dựng SeriesRanking (định dạng UI lịch sử theo tuần) từ các issue ranking của BE.
export async function getSeriesRankingTrend(seriesId: string): Promise<SeriesRanking | null> {
  const issues = await getRankingHistory(seriesId).catch(() => [] as RankingIssue[]);
  if (issues.length === 0) return null;

  const sorted = [...issues].sort((a, b) => a.issueNumber - b.issueNumber);
  const history = sorted.map(i => ({
    week: `Kỳ ${i.issueNumber}`,
    rank: i.rankPosition,
    votes: i.voteCount,
  }));
  const current = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const currentRank = current.rankPosition;
  const previousRank = previous ? previous.rankPosition : current.rankPosition;
  const delta = previousRank - currentRank;

  return {
    seriesId,
    currentRank,
    previousRank,
    voteScore: current.voteCount,
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
    isAtRisk: false,
    history,
  };
}
