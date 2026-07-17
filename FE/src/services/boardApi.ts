import { apiRequest } from './apiClient';

type ApiEnvelope<T> = T | { data: T };

function unwrap<T>(value: ApiEnvelope<T>): T {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export interface PendingSeriesItem {
  id: string;
  title: string;
  status: string;
  authorId: string;
  authorName?: string;
  approveVotes: number;
  rejectVotes: number;
  totalBoardMembers: number;
  votedBoardMembers: number;
  claimedBoardMembers: number;
  requiredClaims: number;
  submittedForReviewAt?: string;
  reviewExpiresAt?: string;
  currentUserHasVoted: boolean;
  currentUserHasClaimed: boolean;
  currentUserIsLead: boolean;
  currentUserInvitationStatus?: string;
  canClaim: boolean;
  canClaimAsLead: boolean;
  claimsFull: boolean;
  hasLead: boolean;
  leadBoardMemberId?: string;
  leadBoardMemberName?: string;
  canManagePublishingSchedule: boolean;
}

interface ApiPendingSeriesItem {
  id: string;
  title: string;
  status: string;
  authorId: string;
  authorName?: string | null;
  approveVotes: number;
  rejectVotes: number;
  totalBoardMembers: number;
  votedBoardMembers: number;
  claimedBoardMembers: number;
  requiredClaims: number;
  submittedForReviewAt?: string | null;
  reviewExpiresAt?: string | null;
  currentUserHasVoted: boolean;
  currentUserHasClaimed: boolean;
  currentUserIsLead: boolean;
  currentUserInvitationStatus?: string | null;
  canClaim: boolean;
  canClaimAsLead: boolean;
  claimsFull: boolean;
  hasLead: boolean;
  leadBoardMemberId?: string | null;
  leadBoardMemberName?: string | null;
  canManagePublishingSchedule: boolean;
}

export const BOARD_VOTES_REQUIRED = 3;
export const BOARD_CLAIMS_REQUIRED = 3;

export interface BoardVoteProgress {
  totalBoardMembers: number;
  votedBoardMembers: number;
  approveVotes: number;
  rejectVotes: number;
  requiredVotes: number;
  quorumMet: boolean;
  claimedBoardMembers: number;
  requiredClaims: number;
  currentUserHasClaimed: boolean;
  currentUserIsLead: boolean;
  canClaim: boolean;
  canClaimAsLead: boolean;
  claimsFull: boolean;
  hasLead: boolean;
  leadBoardMemberId?: string;
  leadBoardMemberName?: string;
  canManagePublishingSchedule: boolean;
  canVote: boolean;
  canClaimLead: boolean;
  leadClaimExpiresAt?: string;
  seriesStatus?: string;
}

interface ApiBoardVoteProgress {
  totalBoardMembers: number;
  votedBoardMembers: number;
  approveVotes: number;
  rejectVotes: number;
  requiredVotes: number;
  quorumMet: boolean;
  claimedBoardMembers: number;
  requiredClaims: number;
  currentUserHasClaimed: boolean;
  currentUserIsLead: boolean;
  canClaim: boolean;
  canClaimAsLead: boolean;
  claimsFull: boolean;
  hasLead: boolean;
  leadBoardMemberId?: string | null;
  leadBoardMemberName?: string | null;
  canManagePublishingSchedule: boolean;
  canVote?: boolean;
  canClaimLead?: boolean;
  leadClaimExpiresAt?: string | null;
  seriesStatus?: string | null;
}

export interface BoardReviewClaim {
  seriesId: string;
  boardMemberId: string;
  claimedBoardMembers: number;
  requiredClaims: number;
  claimsFull: boolean;
  isLead: boolean;
  hasLead: boolean;
  leadBoardMemberId?: string;
  leadBoardMemberName?: string;
  claimedAt: string;
}

interface ApiBoardReviewClaim {
  seriesId: string;
  boardMemberId: string;
  claimedBoardMembers: number;
  requiredClaims: number;
  claimsFull: boolean;
  isLead: boolean;
  hasLead: boolean;
  leadBoardMemberId?: string | null;
  leadBoardMemberName?: string | null;
  claimedAt: string;
}

export interface LeaderboardItem {
  seriesId: string;
  title: string;
  latestRank: number | null;
  totalVotes: number;
  popularityScore: number;
}

interface ApiLeaderboardItem {
  seriesId: string;
  title: string;
  latestRank?: number | null;
  totalVotes: number;
  popularityScore: number;
}

export type BoardDecision = 'approve' | 'reject';
export type DangerSeriesDecision = 'continue' | 'monthly' | 'hiatus' | 'cancel';

export interface BoardVote {
  id: string;
  seriesId?: string;
  seriesTitle?: string;
  boardMemberId?: string;
  boardMemberName?: string;
  decision: string;
  comment?: string;
  createdAt?: string;
}

interface ApiBoardVote {
  id: string;
  seriesId?: string | null;
  seriesTitle?: string | null;
  boardMemberId?: string | null;
  boardMemberName?: string | null;
  decision: string;
  comment?: string | null;
  createdAt?: string | null;
}

function mapPendingSeriesItem(item: ApiPendingSeriesItem): PendingSeriesItem {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    authorId: item.authorId,
    authorName: item.authorName ?? undefined,
    approveVotes: item.approveVotes,
    rejectVotes: item.rejectVotes,
    totalBoardMembers: item.totalBoardMembers,
    votedBoardMembers: item.votedBoardMembers,
    claimedBoardMembers: item.claimedBoardMembers,
    requiredClaims: item.requiredClaims ?? BOARD_CLAIMS_REQUIRED,
    submittedForReviewAt: item.submittedForReviewAt ?? undefined,
    reviewExpiresAt: item.reviewExpiresAt ?? undefined,
    currentUserHasVoted: item.currentUserHasVoted,
    currentUserHasClaimed: item.currentUserHasClaimed,
    currentUserIsLead: item.currentUserIsLead ?? false,
    currentUserInvitationStatus: item.currentUserInvitationStatus ?? undefined,
    canClaim: item.canClaim,
    canClaimAsLead: item.canClaimAsLead ?? false,
    claimsFull: item.claimsFull,
    hasLead: item.hasLead ?? false,
    leadBoardMemberId: item.leadBoardMemberId ?? undefined,
    leadBoardMemberName: item.leadBoardMemberName ?? undefined,
    canManagePublishingSchedule: item.canManagePublishingSchedule ?? false,
  };
}

function mapVoteProgress(item: ApiBoardVoteProgress): BoardVoteProgress {
  return {
    totalBoardMembers: item.totalBoardMembers,
    votedBoardMembers: item.votedBoardMembers,
    approveVotes: item.approveVotes,
    rejectVotes: item.rejectVotes,
    requiredVotes: item.requiredVotes ?? BOARD_VOTES_REQUIRED,
    quorumMet: item.quorumMet,
    claimedBoardMembers: item.claimedBoardMembers ?? 0,
    requiredClaims: item.requiredClaims ?? BOARD_CLAIMS_REQUIRED,
    currentUserHasClaimed: item.currentUserHasClaimed ?? false,
    currentUserIsLead: item.currentUserIsLead ?? false,
    canClaim: item.canClaim ?? false,
    canClaimAsLead: item.canClaimAsLead ?? false,
    claimsFull: item.claimsFull ?? false,
    hasLead: item.hasLead ?? false,
    leadBoardMemberId: item.leadBoardMemberId ?? undefined,
    leadBoardMemberName: item.leadBoardMemberName ?? undefined,
    canManagePublishingSchedule: item.canManagePublishingSchedule ?? false,
    canVote: item.canVote ?? false,
    canClaimLead: item.canClaimLead ?? false,
    leadClaimExpiresAt: item.leadClaimExpiresAt ?? undefined,
    seriesStatus: item.seriesStatus ?? undefined,
  };
}

function mapVote(item: ApiBoardVote): BoardVote {
  return {
    id: item.id,
    seriesId: item.seriesId ?? undefined,
    seriesTitle: item.seriesTitle ?? undefined,
    boardMemberId: item.boardMemberId ?? undefined,
    boardMemberName: item.boardMemberName ?? undefined,
    decision: item.decision,
    comment: item.comment ?? undefined,
    createdAt: item.createdAt ?? undefined,
  };
}

export async function getPendingSeries(): Promise<PendingSeriesItem[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiPendingSeriesItem[]>>('/api/board/pending-series'));
  return items.map(mapPendingSeriesItem);
}

export interface BoardReviewerSummary {
  boardMemberId: string;
  boardMemberName: string;
  source: string;
  isLead: boolean;
}

export async function listSeriesReviewers(seriesId: string): Promise<BoardReviewerSummary[]> {
  const items = unwrap(
    await apiRequest<ApiEnvelope<Array<{
      boardMemberId: string;
      boardMemberName: string;
      source: string;
      isLead: boolean;
    }>>>(`/api/board/series/${seriesId}/reviewers`)
  );
  return items.map(i => ({
    boardMemberId: i.boardMemberId,
    boardMemberName: i.boardMemberName,
    source: i.source,
    isLead: !!i.isLead,
  }));
}

export interface GlobalBoardLead {
  boardMemberId: string;
  boardMemberName: string;
}

export async function listBoardLeads(): Promise<GlobalBoardLead[]> {
  try {
    const items = unwrap(
      await apiRequest<ApiEnvelope<Array<{ boardMemberId: string; boardMemberName: string }>>>(
        '/api/board/leads'
      )
    );
    return (items ?? []).map(item => ({
      boardMemberId: item.boardMemberId,
      boardMemberName: item.boardMemberName,
    }));
  } catch {
    // Compat BE cũ: chỉ có 1 lead qua /global-lead
    try {
      const raw = await apiRequest<
        ApiEnvelope<{ boardMemberId: string; boardMemberName: string }> | null | undefined
      >('/api/board/global-lead');
      if (raw == null) return [];
      const item = unwrap(raw as ApiEnvelope<{ boardMemberId: string; boardMemberName: string }>);
      if (!item?.boardMemberId) return [];
      return [{ boardMemberId: item.boardMemberId, boardMemberName: item.boardMemberName }];
    } catch {
      return [];
    }
  }
}

export async function getGlobalBoardLead(): Promise<GlobalBoardLead | null> {
  const leads = await listBoardLeads();
  return leads[0] ?? null;
}

export async function assignGlobalBoardLead(boardMemberId: string): Promise<GlobalBoardLead> {
  // PUT /global-lead vẫn được BE mới map cùng logic gán chức vụ Lead (cho phép nhiều Lead).
  const item = unwrap(
    await apiRequest<ApiEnvelope<{ boardMemberId: string; boardMemberName: string }>>(
      '/api/board/global-lead',
      {
        method: 'PUT',
        body: JSON.stringify({ boardMemberId }),
      }
    )
  );
  return {
    boardMemberId: item.boardMemberId,
    boardMemberName: item.boardMemberName,
  };
}

export async function clearBoardLeadRole(boardMemberId: string): Promise<void> {
  try {
    await apiRequest(`/api/board/leads/${boardMemberId}`, { method: 'DELETE' });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (!message.includes('không tìm thấy') && !message.includes('not found')) {
      throw err;
    }
    // Compat BE cũ: chỉ hỗ trợ xóa toàn bộ
    await apiRequest('/api/board/global-lead', { method: 'DELETE' });
  }
}

export interface SeriesEditorAssignment {
  seriesId: string;
  seriesTitle: string;
  editorId?: string | null;
  editorName?: string | null;
}

export async function assignSeriesEditor(seriesId: string, editorId: string): Promise<SeriesEditorAssignment> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<{
      seriesId: string;
      seriesTitle: string;
      editorId?: string | null;
      editorName?: string | null;
    }>>(`/api/board/series/${seriesId}/editor`, {
      method: 'PUT',
      body: JSON.stringify({ editorId }),
    })
  );
  return {
    seriesId: item.seriesId,
    seriesTitle: item.seriesTitle,
    editorId: item.editorId,
    editorName: item.editorName,
  };
}

export async function clearSeriesEditor(seriesId: string): Promise<void> {
  await apiRequest(`/api/board/series/${seriesId}/editor`, { method: 'DELETE' });
}

export async function clearGlobalBoardLead(): Promise<void> {
  await apiRequest('/api/board/global-lead', { method: 'DELETE' });
}

export async function assignSeriesLead(seriesId: string, boardMemberId: string): Promise<BoardReviewClaim> {
  // Deprecated: maps to global lead assignment; seriesId ignored by server contract changes.
  void seriesId;
  const lead = await assignGlobalBoardLead(boardMemberId);
  return {
    seriesId: seriesId,
    boardMemberId: lead.boardMemberId,
    claimedBoardMembers: 0,
    requiredClaims: BOARD_CLAIMS_REQUIRED,
    claimsFull: false,
    isLead: true,
    hasLead: true,
    leadBoardMemberId: lead.boardMemberId,
    leadBoardMemberName: lead.boardMemberName,
    claimedAt: new Date().toISOString(),
  };
}

export async function getBoardVoteProgress(seriesId: string): Promise<BoardVoteProgress> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiBoardVoteProgress>>(`/api/board/vote-progress?seriesId=${seriesId}`)
  );
  return mapVoteProgress(item);
}

export async function getLeaderboard(metric?: string, issueNumber?: number): Promise<LeaderboardItem[]> {
  const params = new URLSearchParams();
  if (metric) params.set('metric', metric);
  if (issueNumber != null) params.set('issueNumber', String(issueNumber));
  const query = params.toString() ? `?${params.toString()}` : '';
  const items = unwrap(await apiRequest<ApiEnvelope<ApiLeaderboardItem[]>>(`/api/board/leaderboard${query}`));
  return items.map(item => ({
    seriesId: item.seriesId,
    title: item.title,
    latestRank: item.latestRank ?? null,
    totalVotes: item.totalVotes,
    popularityScore: Number(item.popularityScore ?? 0),
  }));
}

export interface VoteInputSeriesRow {
  seriesId: string;
  title: string;
  status: string;
  existingRankPosition?: number | null;
  existingVoteCount?: number | null;
  existingPopularityScore?: number | null;
  existingNotes?: string | null;
  scheduleCountForIssue: number;
}

export interface VoteInputContext {
  suggestedIssueNumber: number;
  availableIssueNumbers: number[];
  series: VoteInputSeriesRow[];
}

interface ApiVoteInputSeriesRow {
  seriesId: string;
  title: string;
  status: string;
  existingRankPosition?: number | null;
  existingVoteCount?: number | null;
  existingPopularityScore?: number | null;
  existingNotes?: string | null;
  scheduleCountForIssue: number;
}

interface ApiVoteInputContext {
  suggestedIssueNumber: number;
  availableIssueNumbers: number[];
  series: ApiVoteInputSeriesRow[];
}

export async function getVoteInputContext(issueNumber?: number): Promise<VoteInputContext> {
  const query = issueNumber != null ? `?issueNumber=${issueNumber}` : '';
  const item = unwrap(await apiRequest<ApiEnvelope<ApiVoteInputContext>>(`/api/rankings/vote-input${query}`));
  return {
    suggestedIssueNumber: item.suggestedIssueNumber,
    availableIssueNumbers: item.availableIssueNumbers,
    series: item.series.map(row => ({
      seriesId: row.seriesId,
      title: row.title,
      status: row.status,
      existingRankPosition: row.existingRankPosition ?? undefined,
      existingVoteCount: row.existingVoteCount ?? undefined,
      existingPopularityScore: row.existingPopularityScore ?? undefined,
      existingNotes: row.existingNotes ?? undefined,
      scheduleCountForIssue: row.scheduleCountForIssue,
    })),
  };
}

export async function bulkSaveRankings(
  issueNumber: number,
  entries: Array<{
    seriesId: string;
    voteCount?: number;
    popularityScore?: number;
    notes?: string;
  }>
): Promise<void> {
  await apiRequest('/api/rankings/bulk', {
    method: 'POST',
    body: JSON.stringify({ issueNumber, entries }),
  });
}

/** Xóa ranking gắn kỳ cũ (số chương) và đồng bộ lại kỳ lịch XB theo ngày. */
export async function purgeLegacyRankingIssues(): Promise<number> {
  const result = unwrap(await apiRequest<ApiEnvelope<{ deleted: number }>>('/api/rankings/purge-legacy-issues', {
    method: 'POST',
  }));
  return result.deleted ?? 0;
}

export async function deleteRankingInputs(ids: string[]): Promise<number> {
  const result = unwrap(await apiRequest<ApiEnvelope<{ deleted: number }>>('/api/rankings/delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }));
  return result.deleted ?? 0;
}

export async function deleteAllRankingInputs(): Promise<number> {
  const result = unwrap(await apiRequest<ApiEnvelope<{ deleted: number }>>('/api/rankings/delete-all', {
    method: 'POST',
  }));
  return result.deleted ?? 0;
}

export interface RecentRankingInput {
  id: string;
  seriesId: string;
  seriesTitle?: string;
  issueNumber: number;
  rankPosition: number;
  voteCount: number;
  popularityScore: number;
  notes?: string;
  createdAt?: string;
}

interface ApiRankingResponse {
  id: string;
  seriesId: string;
  seriesTitle?: string | null;
  issueNumber: number;
  rankPosition: number;
  voteCount?: number | null;
  popularityScore?: number | null;
  notes?: string | null;
  createdAt?: string | null;
}

export async function getRecentRankingInputs(limit = 40): Promise<RecentRankingInput[]> {
  const items = unwrap(
    await apiRequest<ApiEnvelope<ApiRankingResponse[]>>(`/api/rankings/recent-inputs?limit=${limit}`)
  );
  return items.map(item => ({
    id: item.id,
    seriesId: item.seriesId,
    seriesTitle: item.seriesTitle ?? undefined,
    issueNumber: item.issueNumber,
    rankPosition: item.rankPosition,
    voteCount: item.voteCount ?? 0,
    popularityScore: Number(item.popularityScore ?? 0),
    notes: item.notes ?? undefined,
    createdAt: item.createdAt ?? undefined,
  }));
}

export async function listRankingIssues(): Promise<number[]> {
  return unwrap(await apiRequest<ApiEnvelope<number[]>>('/api/rankings/issues'));
}

export async function listBoardVotes(seriesId?: string): Promise<BoardVote[]> {
  const query = seriesId ? `?seriesId=${seriesId}` : '';
  const items = unwrap(await apiRequest<ApiEnvelope<ApiBoardVote[]>>(`/api/board/votes${query}`));
  return items.map(mapVote);
}

export async function castBoardVote(
  seriesId: string,
  decision: BoardDecision,
  comment?: string,
  publishingFrequency?: 'weekly' | 'monthly'
): Promise<BoardVote> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiBoardVote>>('/api/board/votes', {
      method: 'POST',
      body: JSON.stringify({
        seriesId,
        decision,
        comment,
        publishingFrequency: decision === 'approve' ? publishingFrequency : undefined,
      }),
    })
  );
  return mapVote(item);
}

export async function decideDangerSeries(
  seriesId: string,
  decision: DangerSeriesDecision,
  reason?: string
): Promise<void> {
  await apiRequest(`/api/board/danger-series/${seriesId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, reason }),
  });
}
