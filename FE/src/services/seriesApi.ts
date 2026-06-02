import { apiRequest } from './apiClient';
import type { Chapter, ChapterStatus, Series, SeriesStatus } from '../data/mockData';

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

function dateOnly(value?: string | null): string {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function mapSeries(item: ApiSeries, chaptersCount = 0): Series {
  const genre = item.genre || 'Uncategorized';
  return {
    id: item.id,
    title: item.title,
    genre,
    genres: genre.split(',').map(g => g.trim()).filter(Boolean),
    status: mapSeriesStatus(item.status),
    synopsis: item.description || '',
    targetAudience: item.targetAudience || '',
    publishingType: mapPublishingFrequency(item.publishingFrequency),
    currentRank: 0,
    previousRank: 0,
    voteScore: 0,
    chaptersCount,
    coverUrl: item.coverImageUrl || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=560&fit=crop',
    mangakaId: item.authorId,
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

export async function getSeries(id: string): Promise<Series> {
  const [item, chapters] = await Promise.all([
    apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}`).then(unwrap),
    getSeriesChapters(id).catch(() => []),
  ]);
  return mapSeries(item, chapters.length);
}

export async function getSeriesChapters(id: string): Promise<Chapter[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiChapter[]>>(`/api/series/${id}/chapters`));
  return items.map(mapChapter);
}

export async function getChapter(id: string): Promise<Chapter> {
  const item = unwrap(await apiRequest<ApiEnvelope<ApiChapter>>(`/api/chapters/${id}`));
  return mapChapter(item);
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
