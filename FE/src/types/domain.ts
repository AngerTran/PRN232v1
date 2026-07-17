// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type SeriesStatus =
  | 'Draft' | 'Submitted' | 'Approved' | 'In Progress'
  | 'Revision Required' | 'At Risk' | 'Completed' | 'Published' | 'Cancelled';

export type ChapterStatus = 'Draft' | 'In Progress' | 'Review' | 'Approved' | 'Published';
export type PageStatus = 'Draft' | 'In Progress' | 'Completed' | 'Approved';
export type TaskType = 'Background' | 'Shading' | 'Effect' | 'Screentone' | 'Clean Line' | 'Dialogue Edit';
export type TaskStatus = 'Pending' | 'In Progress' | 'Submitted' | 'Approved' | 'Revision Required';
export type SubmissionStatus = 'Pending' | 'Approved' | 'Revision Required' | 'Rejected';
export type NotifType = 'task_submitted' | 'task_approved' | 'revision_required' | 'deadline_warning' | 'ranking_alert' | 'submission_update' | 'system';
export type PaymentStatus = 'Pending' | 'Paid';
export type ReviewStatus = 'Pending' | 'In Review' | 'Approved' | 'Revision Required';
export type AnnotationType = 'Story' | 'Dialogue' | 'Panel Layout' | 'Character' | 'Pacing' | 'Art Correction';
export type AnnotationPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type NoteType = 'Story concern' | 'Publishing concern' | 'Ranking concern' | 'Meeting note';
export type RiskLevel = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'mangaka' | 'assistant' | 'editor' | 'board' | 'admin';
  avatar: string;
  bio: string;
  joinDate: string;
  specialties?: string[];
  payoutBankName?: string;
  payoutBankAccountNumber?: string;
  payoutBankAccountHolder?: string;
}

export interface Series {
  id: string;
  title: string;
  genre: string;
  genres: string[];
  status: SeriesStatus;
  synopsis: string;
  targetAudience: string;
  publishingType: 'Weekly' | 'Bi-weekly' | 'Monthly';
  currentRank: number;
  previousRank: number;
  voteScore: number;
  chaptersCount: number;
  coverUrl: string;
  mangakaId: string;
  mangakaName?: string;
  editorId?: string;
  editorName?: string;
  mainCharacters?: string;
  createdAt: string;
  updatedAt: string;
  submittedForReviewAt?: string;
  reviewExpiresAt?: string;
  isAtRisk: boolean;
  editorDefenseNote?: string;
  editorDefenseNoteUpdatedAt?: string;
}

export interface Chapter {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  deadline: string;
  progress: number;
  status: ChapterStatus;
  pagesCount: number;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MangaPage {
  id: string;
  chapterId: string;
  pageNumber: number;
  status: PageStatus;
  thumbnailUrl?: string;
  tasksCount: number;
  completedTasksCount: number;
  panelLayout: number; // 0-3 for different layouts
}

export interface Task {
  id: string;
  pageId: string;
  chapterId: string;
  seriesId: string;
  seriesTitle: string;
  chapterTitle: string;
  pageNumber: number;
  title: string;
  type: TaskType;
  assistantId: string;
  description: string;
  deadline: string;
  price: number;
  status: TaskStatus;
  region: { x: number; y: number; width: number; height: number };
  submittedResult?: string;
  submittedFileUrl?: string;
  mangakaFeedback?: string;
  reviewedAt?: string;
  assistantSubmissionNote?: string;
  createdAt: string;
  resourceUrls?: string[];
  assignedByName?: string;
  pageImageUrl?: string;
  paymentStatus?: string | null;
  paidAt?: string;
  paymentReference?: string;
}

export interface Submission {
  id: string;
  seriesId: string;
  seriesTitle: string;
  submittedDate: string;
  status: SubmissionStatus;
  boardDecision?: string;
  feedback?: string;
}

export interface RankingEntry {
  week: string;
  rank: number;
  votes: number;
}

export interface SeriesRanking {
  seriesId: string;
  currentRank: number;
  previousRank: number;
  voteScore: number;
  trend: 'up' | 'down' | 'stable';
  isAtRisk: boolean;
  history: RankingEntry[];
}

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkTo?: string;
}

export interface AssistantIncome {
  id: string;
  taskId: string;
  taskTitle: string;
  seriesTitle: string;
  approvedDate: string;
  price: number;
  paymentStatus: PaymentStatus;
}

export interface AssistantCalendarEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  seriesTitle: string;
  chapterTitle: string;
  deadline: string;
  isOverdue: boolean;
}

export interface Annotation {
  id: string;
  chapterId: string;
  pageId: string;
  editorId: string;
  type: AnnotationType;
  priority: AnnotationPriority;
  comment: string;
  suggestedChange?: string;
  region: { x: number; y: number; width: number; height: number };
  createdAt: string;
}

export interface EditorReview {
  id: string;
  chapterId: string;
  seriesId: string;
  editorId: string;
  status: ReviewStatus;
  annotationsCount: number;
  submittedDate: string;
  reviewedDate?: string;
  overallComment?: string;
}

export interface EditorNote {
  id: string;
  seriesId: string;
  chapterId?: string;
  editorId: string;
  type: NoteType;
  title: string;
  content: string;
  priority: AnnotationPriority;
  createdAt: string;
}

export interface DeadlineInfo {
  id: string;
  seriesId: string;
  chapterId: string;
  deadline: string;
  progress: number;
  riskLevel: RiskLevel;
}

export type BoardSubmissionStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'More Info Required';
export type BoardDecisionType = 'Continue' | 'Cancel' | 'Change to Monthly' | 'Hiatus';
export type PublishingScheduleStatus = 'Active' | 'Paused' | 'Cancelled';

export interface BoardSubmission {
  id: string;
  seriesTitle: string;
  mangakaName: string;
  mangakaAvatar: string;
  genre: string;
  submittedDate: string;
  status: BoardSubmissionStatus;
  synopsis: string;
  targetAudience: string;
  coverUrl: string;
  characters: { name: string; role: string; description: string }[];
  editorRecommendation: string;
  editorName: string;
  voteResult: { approve: number; reject: number; moreInfo: number };
}

export interface BoardVote {
  id: string;
  submissionId: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  decision: 'Approve' | 'Reject' | 'More Info';
  reason: string;
  votedAt: string;
}

export interface PublishingSchedule {
  id: string;
  seriesId: string;
  seriesTitle: string;
  mangakaName: string;
  publishingType: 'Weekly' | 'Monthly';
  releaseDay: string;
  startDate: string;
  nextReleaseDate: string;
  status: PublishingScheduleStatus;
  note?: string;
}

export interface ReaderVoteInput {
  id: string;
  issueNumber: number;
  seriesId: string;
  seriesTitle: string;
  releaseDate: string;
  voteCount: number;
  readerScore: number;
  comment?: string;
  inputDate: string;
}

export interface BoardRanking {
  id: string;
  rank: number;
  previousRank: number;
  seriesTitle: string;
  mangakaName: string;
  voteScore: number;
  trend: 'up' | 'down' | 'stable';
  status: 'At Risk' | 'Stable' | 'Rising';
  publishingType: 'Weekly' | 'Monthly';
}

export interface SeriesDecision {
  id: string;
  seriesId: string;
  seriesTitle: string;
  mangakaName: string;
  mangakaAvatar: string;
  coverUrl: string;
  currentRank: number;
  bottomRankingCount: number;
  latestVoteScore: number;
  riskReason: string;
  decision?: BoardDecisionType;
  decisionReason?: string;
  effectiveDate?: string;
  rankingHistory: { week: string; rank: number }[];
  voteHistory: { issue: number; score: number; date: string }[];
  editorDefenseNote: string;
  boardDiscussion: { memberName: string; memberAvatar: string; comment: string; timestamp: string }[];
}

// â”€â”€â”€ Board Mock Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€



