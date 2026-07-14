import { apiRequest, API_BASE_URL } from './apiClient';
import { getChapterTaskStats } from './workspaceApi';
import type { Chapter, ChapterStatus, Series, SeriesRanking, SeriesStatus } from '../types/domain';

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
  submittedForReviewAt?: string | null;
  editorDefenseNote?: string | null;
  editorDefenseNoteUpdatedAt?: string | null;
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

export const DANGER_RANK_THRESHOLD = 30;

export function mapUiStatusToApi(status: SeriesStatus): string {
  const map: Record<SeriesStatus, string> = {
    Draft: 'draft',
    Submitted: 'pending_review',
    Approved: 'approved',
    'In Progress': 'publishing',
    'At Risk': 'hiatus',
    Cancelled: 'cancelled',
    Completed: 'completed',
  };
  return map[status] ?? 'draft';
}


/** Series đang publishing và rank ≥ ngưỡng → vùng nguy hiểm. */
export function computeSeriesAtRisk(apiStatus: string | undefined, rankPosition: number): boolean {
  return (apiStatus?.toLowerCase() === 'publishing') && rankPosition >= DANGER_RANK_THRESHOLD;
}

function enrichSeriesWithRanking(
  series: Series,
  apiStatus: string,
  ranking?: { rankPosition: number; voteCount: number }
): Series {
  const rank = ranking?.rankPosition ?? series.currentRank ?? 0;
  return {
    ...series,
    currentRank: rank,
    voteScore: ranking?.voteCount ?? series.voteScore,
    isAtRisk: computeSeriesAtRisk(apiStatus, rank),
  };
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
      return 'Completed';
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
    editorId: item.editorId ?? undefined,
    editorName: item.editorName ?? undefined,
    createdAt: dateOnly(item.createdAt),
    updatedAt: dateOnly(item.updatedAt),
    submittedForReviewAt: item.submittedForReviewAt ? dateOnly(item.submittedForReviewAt) : undefined,
    reviewExpiresAt: item.submittedForReviewAt
      ? dateOnly(new Date(new Date(item.submittedForReviewAt).getTime() + 30 * 86400000).toISOString())
      : undefined,
    isAtRisk: false,
    editorDefenseNote: item.editorDefenseNote ?? undefined,
    editorDefenseNoteUpdatedAt: item.editorDefenseNoteUpdatedAt
      ? dateOnly(item.editorDefenseNoteUpdatedAt)
      : undefined,
  };
}

export function mapChapter(item: ApiChapter): Chapter {
  return {
    id: item.id,
    seriesId: item.seriesId,
    number: item.chapterNumber,
    title: item.title || `Chapter ${item.chapterNumber}`,
    deadline: item.deadline ? dateOnly(item.deadline) : '',
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
  const [items, rankings] = await Promise.all([
    unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series/my-series')),
    getSeriesRanking().catch(() => [] as SeriesRankingItem[]),
  ]);
  const rankById = new Map(rankings.map(r => [r.seriesId, r]));
  return Promise.all(items.map(async item => {
    const chapters = await getSeriesChapters(item.id).catch(() => []);
    const base = mapSeries(item, chapters.length);
    const ranking = rankById.get(item.id);
    return enrichSeriesWithRanking(
      base,
      item.status,
      ranking ? { rankPosition: ranking.rankPosition, voteCount: ranking.voteCount } : undefined
    );
  }));
}

/** Series đã gửi lên hội đồng (không còn ở trạng thái nháp). */
export function isSeriesSubmitted(status: SeriesStatus): boolean {
  return status !== 'Draft';
}

/** Mangaka chỉ được sản xuất (chương, trang, task) sau khi hội đồng duyệt. */
export function canMangakaProduceOnSeries(status: SeriesStatus): boolean {
  return status === 'Approved' || status === 'In Progress' || status === 'At Risk';
}

/** Hội đồng chỉ lên lịch xuất bản khi editor đánh dấu hoàn thành. */
export function canSchedulePublishing(status: SeriesStatus): boolean {
  return status === 'Completed';
}

export const SERIES_PRODUCTION_LOCK_HINT: Partial<Record<SeriesStatus, string>> = {
  Draft: 'Hoàn tất hồ sơ và gửi hội đồng xét duyệt trước khi bắt đầu sản xuất.',
  Submitted: 'Series đang chờ hội đồng xét duyệt — tạm khóa mọi thao tác sản xuất.',
  Cancelled: 'Series đã bị từ chối — không thể tiếp tục sản xuất.',
  Completed: 'Series đã hoàn thành — không thể thêm chương mới.',
};

export const SERIES_SUBMISSION_STATUS_HINT: Record<SeriesStatus, string> = {
  Draft: 'Series chưa được gửi xét duyệt.',
  Submitted: 'Đang chờ 3 board cố định xét duyệt (hạn 48 giờ).',
  Approved: 'Hội đồng đã phê duyệt series.',
  'In Progress': 'Series đang trong quá trình xuất bản.',
  'Revision Required': 'Hội đồng yêu cầu chỉnh sửa trước khi duyệt.',
  'At Risk': 'Series đang có nguy cơ bị tạm dừng do xếp hạng thấp.',
  Completed: 'Editor đã đánh dấu series hoàn thành sản xuất.',
  Published: 'Series đã xuất bản.',
  Cancelled: 'Hội đồng đã từ chối hoặc hết hạn 48 giờ xét duyệt — bạn có thể chỉnh sửa và gửi lại.',
};

export const REVIEW_EXPIRY_HOURS = 48;
/** @deprecated dùng REVIEW_EXPIRY_HOURS */
export const REVIEW_EXPIRY_DAYS = 2;

/** Lịch sử nộp series của mangaka — mọi series đã gửi duyệt, mới nhất trước. */
export async function getSubmittedSeries(): Promise<Series[]> {
  const items = await getMySeries();
  return items
    .filter(s => isSeriesSubmitted(s.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getVisibleSeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series'));
  return Promise.all(items.map(async item => {
    const chapters = await getSeriesChapters(item.id).catch(() => []);
    return mapSeries(item, chapters.length);
  }));
}

/** Danh sách series cho admin (không tải từng chapter — nhanh hơn khi lọc/xóa). */
export async function getVisibleSeriesLight(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series'));
  return items
    .map(item => mapSeries(item))
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

const APPROVED_SERIES_STATUSES = new Set(['approved', 'publishing', 'completed', 'hiatus']);

/** Series đã qua hội đồng (approved trở đi), không tải chapter để nhẹ hơn. */
export async function getApprovedSeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series'));
  return items
    .filter(item => APPROVED_SERIES_STATUSES.has(item.status?.toLowerCase() ?? ''))
    .map(item => mapSeries(item));
}

/** Series editor đã đánh dấu hoàn thành — đủ điều kiện lên lịch xuất bản. */
export async function getCompletedSeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series'));
  return items
    .filter(item => item.status?.toLowerCase() === 'completed')
    .map(item => mapSeries(item));
}

export async function getDangerZoneSeries(): Promise<Series[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiSeries[]>>('/api/series/danger-zone'));
  return items.map(item => mapSeries(item));
}

export async function getSeries(id: string): Promise<Series> {
  const [item, chapters, stats] = await Promise.all([
    apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}`).then(unwrap),
    getSeriesChapters(id).catch(() => []),
    getSeriesStats(id).catch(() => null),
  ]);
  let series = mapSeries(item, chapters.length);
  if (stats?.latestRanking) {
    series = enrichSeriesWithRanking(series, item.status, {
      rankPosition: stats.latestRanking.rankPosition,
      voteCount: stats.latestRanking.voteCount,
    });
  } else if (stats?.inDangerZone) {
    series = { ...series, isAtRisk: true };
  }
  return series;
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

export async function updateSeries(id: string, input: { editorId?: string }): Promise<Series> {
  const updated = unwrap(await apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }));
  return mapSeries(updated);
}

export interface UpdateSeriesProfileInput {
  title?: string;
  description?: string;
  genre?: string;
  targetAudience?: string;
  publishingFrequency?: string;
}

/** Cập nhật metadata series (tiêu đề, tóm tắt, thể loại, …). */
export async function updateSeriesProfile(id: string, input: UpdateSeriesProfileInput): Promise<Series> {
  const updated = unwrap(await apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      genre: input.genre,
      targetAudience: input.targetAudience,
      publishingFrequency: input.publishingFrequency
        ? toApiPublishingFrequency(input.publishingFrequency)
        : undefined,
    }),
  }));
  return mapSeries(updated);
}

/** Upload hoặc thay file bản thảo đề xuất (chapter 0). */
export async function upsertSeriesProposalManuscript(
  seriesId: string,
  file: File,
  existingProposalChapterId?: string,
): Promise<Chapter> {
  if (existingProposalChapterId) {
    return uploadChapterManuscript(existingProposalChapterId, file);
  }
  return uploadSeriesProposalManuscript(seriesId, file);
}

export interface SeriesEditorInvitation {
  seriesId: string;
  seriesTitle: string;
  mangakaId: string;
  mangakaName: string;
  editorId: string;
  editorName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string | null;
}

/** Mangaka gửi lời mời editor phụ trách series (chờ editor chấp nhận). */
export async function inviteSeriesEditor(seriesId: string, editorId: string): Promise<SeriesEditorInvitation> {
  return unwrap(await apiRequest<ApiEnvelope<SeriesEditorInvitation>>(`/api/series/${seriesId}/editor-invitations`, {
    method: 'POST',
    body: JSON.stringify({ editorId }),
  }));
}

export async function getSentEditorInvitations(): Promise<SeriesEditorInvitation[]> {
  return unwrap(await apiRequest<ApiEnvelope<SeriesEditorInvitation[]>>('/api/series/editor-invitations/sent'));
}

export async function getMyEditorInvitations(): Promise<SeriesEditorInvitation[]> {
  return unwrap(await apiRequest<ApiEnvelope<SeriesEditorInvitation[]>>('/api/series/editor-invitations/mine'));
}

export async function respondToEditorInvitation(
  seriesId: string,
  action: 'accept' | 'reject'
): Promise<SeriesEditorInvitation> {
  return unwrap(await apiRequest<ApiEnvelope<SeriesEditorInvitation>>(
    `/api/series/editor-invitations/${seriesId}/${action}`,
    { method: 'PATCH' }
  ));
}

export async function updateSeriesStatus(id: string, status: string): Promise<Series> {
  const updated = unwrap(await apiRequest<ApiEnvelope<ApiSeries>>(`/api/series/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }));
  return mapSeries(updated);
}

/** Editor đánh dấu series hoàn thành sản xuất. */
export async function markSeriesCompleted(id: string): Promise<Series> {
  return updateSeriesStatus(id, 'completed');
}

/** Gửi series lên hội đồng xét duyệt (draft → pending_review). */
export async function submitSeriesForReview(id: string): Promise<Series> {
  return updateSeriesStatus(id, 'pending_review');
}

/** Gửi lại series sau khi bị từ chối / hết hạn (cancelled → pending_review). */
export async function resubmitSeriesForReview(id: string): Promise<Series> {
  return updateSeriesStatus(id, 'pending_review');
}

export interface BoardReviewerSummary {
  boardMemberId: string;
  boardMemberName: string;
  source: string;
  isLead?: boolean;
}

export type SeriesTeamRole = 'mangaka' | 'editor' | 'board_lead' | 'board' | 'assistant';

export interface SeriesTeamMember {
  id: string;
  name: string;
  role: SeriesTeamRole;
}

export interface SeriesTeam {
  mangaka: SeriesTeamMember;
  editor: SeriesTeamMember | null;
  boardReviewers: SeriesTeamMember[];
  assistants: SeriesTeamMember[];
}

export interface SeriesBoardReviewStatus {
  seriesId: string;
  approveVotes: number;
  rejectVotes: number;
  votedBoardMembers: number;
  requiredVotes: number;
  pendingInvitations: number;
  availableInviteSlots: number;
  submittedForReviewAt?: string | null;
  reviewExpiresAt?: string | null;
  quorumMet: boolean;
  claimedBoardMembers?: number;
  claimedReviewers?: BoardReviewerSummary[];
}

export async function getSeriesBoardReviewStatus(seriesId: string): Promise<SeriesBoardReviewStatus> {
  return unwrap(await apiRequest<ApiEnvelope<SeriesBoardReviewStatus>>(`/api/series/${seriesId}/board-review-status`));
}

export async function getSeriesTeam(seriesId: string): Promise<SeriesTeam> {
  const raw = unwrap(await apiRequest<ApiEnvelope<{
    mangaka: { id: string; name: string; role: string };
    editor?: { id: string; name: string; role: string } | null;
    boardReviewers: Array<{ id: string; name: string; role: string }>;
    assistants: Array<{ id: string; name: string; role: string }>;
  }>>(`/api/series/${seriesId}/team`));

  const mapMember = (m: { id: string; name: string; role: string }): SeriesTeamMember => ({
    id: m.id,
    name: m.name,
    role: (m.role === 'board_lead' || m.role === 'board' || m.role === 'mangaka' || m.role === 'editor' || m.role === 'assistant'
      ? m.role
      : 'board') as SeriesTeamRole,
  });

  return {
    mangaka: mapMember(raw.mangaka),
    editor: raw.editor ? mapMember(raw.editor) : null,
    boardReviewers: (raw.boardReviewers ?? []).map(mapMember),
    assistants: (raw.assistants ?? []).map(mapMember),
  };
}

/** Mangaka chỉ được xóa series của mình khi còn ở trạng thái nháp. */
export function canMangakaDeleteSeries(status: SeriesStatus): boolean {
  return status === 'Draft';
}

/** Mangaka chỉ được xóa chương ở trạng thái bản nháp. */
export function canMangakaDeleteChapter(status: ChapterStatus): boolean {
  return status === 'Draft';
}

/** Series đã kết thúc sản xuất — deadline chương nháp còn sót không còn là việc cần làm. */
export function isSeriesClosedForProduction(status: SeriesStatus): boolean {
  return status === 'Completed' || status === 'Cancelled' || status === 'Published';
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

export async function createRanking(input: {
  seriesId: string;
  issueNumber: number;
  rankPosition: number;
  voteCount?: number;
  popularityScore?: number;
}): Promise<RankingIssue> {
  const item = unwrap(await apiRequest<ApiEnvelope<{
    id: string;
    seriesId: string;
    issueNumber: number;
    rankPosition: number;
    voteCount?: number | null;
    popularityScore?: number | null;
    createdAt?: string | null;
  }>>('/api/rankings', {
    method: 'POST',
    body: JSON.stringify(input),
  }));
  return {
    id: item.id,
    seriesId: item.seriesId,
    issueNumber: item.issueNumber,
    rankPosition: item.rankPosition,
    voteCount: item.voteCount ?? 0,
    popularityScore: Number(item.popularityScore ?? 0),
    createdAt: item.createdAt ?? undefined,
  };
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
export async function getSeriesRankingTrend(
  seriesId: string,
  apiStatus?: string
): Promise<SeriesRanking | null> {
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
    isAtRisk: computeSeriesAtRisk(apiStatus ?? 'publishing', currentRank),
    history,
  };
}
