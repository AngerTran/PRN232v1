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

export async function getInReviewSeries(): Promise<PendingSeriesItem[]> {
  const items = unwrap(await apiRequest<ApiEnvelope<ApiPendingSeriesItem[]>>('/api/board/in-review-series'));
  return items.map(mapPendingSeriesItem);
}

export async function claimSeriesReview(seriesId: string, wantLead = false): Promise<BoardReviewClaim> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiBoardReviewClaim>>(`/api/board/series/${seriesId}/claim-review`, {
      method: 'POST',
      body: JSON.stringify({ wantLead }),
    })
  );
  return {
    seriesId: item.seriesId,
    boardMemberId: item.boardMemberId,
    claimedBoardMembers: item.claimedBoardMembers,
    requiredClaims: item.requiredClaims,
    claimsFull: item.claimsFull,
    isLead: item.isLead,
    hasLead: item.hasLead,
    leadBoardMemberId: item.leadBoardMemberId ?? undefined,
    leadBoardMemberName: item.leadBoardMemberName ?? undefined,
    claimedAt: item.claimedAt,
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
    rankPosition: number;
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
