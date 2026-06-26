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
  submittedForReviewAt?: string;
  reviewExpiresAt?: string;
  currentUserHasVoted: boolean;
  currentUserInvitationStatus?: string;
  canVolunteerReview: boolean;
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
  submittedForReviewAt?: string | null;
  reviewExpiresAt?: string | null;
  currentUserHasVoted: boolean;
  currentUserInvitationStatus?: string | null;
  canVolunteerReview: boolean;
}

export const BOARD_VOTES_REQUIRED = 3;

export interface BoardVoteProgress {
  totalBoardMembers: number;
  votedBoardMembers: number;
  approveVotes: number;
  rejectVotes: number;
  requiredVotes: number;
  quorumMet: boolean;
}

interface ApiBoardVoteProgress {
  totalBoardMembers: number;
  votedBoardMembers: number;
  approveVotes: number;
  rejectVotes: number;
  requiredVotes: number;
  quorumMet: boolean;
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
  return items.map(item => ({
    id: item.id,
    title: item.title,
    status: item.status,
    authorId: item.authorId,
    authorName: item.authorName ?? undefined,
    approveVotes: item.approveVotes,
    rejectVotes: item.rejectVotes,
    totalBoardMembers: item.totalBoardMembers,
    votedBoardMembers: item.votedBoardMembers,
    submittedForReviewAt: item.submittedForReviewAt ?? undefined,
    reviewExpiresAt: item.reviewExpiresAt ?? undefined,
    currentUserHasVoted: item.currentUserHasVoted,
    currentUserInvitationStatus: item.currentUserInvitationStatus ?? undefined,
    canVolunteerReview: item.canVolunteerReview,
  }));
}

export async function getBoardVoteProgress(seriesId: string): Promise<BoardVoteProgress> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiBoardVoteProgress>>(`/api/board/vote-progress?seriesId=${seriesId}`)
  );
  return {
    totalBoardMembers: item.totalBoardMembers,
    votedBoardMembers: item.votedBoardMembers,
    approveVotes: item.approveVotes,
    rejectVotes: item.rejectVotes,
    requiredVotes: item.requiredVotes ?? BOARD_VOTES_REQUIRED,
    quorumMet: item.quorumMet,
  };
}

export async function getLeaderboard(metric?: string): Promise<LeaderboardItem[]> {
  const query = metric ? `?metric=${encodeURIComponent(metric)}` : '';
  const items = unwrap(await apiRequest<ApiEnvelope<ApiLeaderboardItem[]>>(`/api/board/leaderboard${query}`));
  return items.map(item => ({
    seriesId: item.seriesId,
    title: item.title,
    latestRank: item.latestRank ?? null,
    totalVotes: item.totalVotes,
    popularityScore: Number(item.popularityScore ?? 0),
  }));
}

export async function listBoardVotes(seriesId?: string): Promise<BoardVote[]> {
  const query = seriesId ? `?seriesId=${seriesId}` : '';
  const items = unwrap(await apiRequest<ApiEnvelope<ApiBoardVote[]>>(`/api/board/votes${query}`));
  return items.map(mapVote);
}

export async function castBoardVote(
  seriesId: string,
  decision: BoardDecision,
  comment?: string
): Promise<BoardVote> {
  const item = unwrap(
    await apiRequest<ApiEnvelope<ApiBoardVote>>('/api/board/votes', {
      method: 'POST',
      body: JSON.stringify({ seriesId, decision, comment }),
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
