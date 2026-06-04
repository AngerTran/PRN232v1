// ─── Types ───────────────────────────────────────────────────────────────────

export type SeriesStatus =
  | 'Draft' | 'Submitted' | 'Approved' | 'In Progress'
  | 'Revision Required' | 'At Risk' | 'Published' | 'Cancelled';

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
  createdAt: string;
  updatedAt: string;
  isAtRisk: boolean;
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
  mangakaFeedback?: string;
  createdAt: string;
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

// ─── Users ───────────────────────────────────────────────────────────────────

export const currentUser: User = {
  id: 'u1',
  name: 'Tanaka Hiroshi',
  email: 'hiroshi.tanaka@inkflow.jp',
  role: 'mangaka',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
  bio: 'Manga artist with 8 years of experience. Known for action and psychological thriller series. Published 3 series in Weekly Shōnen Jump and currently serializing two new titles under InkFlow Editorial.',
  joinDate: '2019-03-15',
};

export const currentAssistant: User = {
  id: 'a1',
  name: 'Yamamoto Keiko',
  email: 'keiko.y@inkstudio.jp',
  role: 'assistant',
  avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format',
  bio: 'Chuyên gia về background art và thiết kế môi trường. 4 năm kinh nghiệm hỗ trợ các mangaka hàng đầu tại InkFlow Studio.',
  joinDate: '2021-06-10',
  specialties: ['Background', 'Screentone'],
};

export const currentEditor: User = {
  id: 'e1',
  name: 'Kobayashi Akira',
  email: 'akira.k@inkflow-editorial.jp',
  role: 'editor',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
  bio: 'Tantou Editor tại InkFlow Editorial. 10 năm kinh nghiệm biên tập manga, chuyên thể loại action và thriller. Đã đưa 5 series lên top 10 ranking.',
  joinDate: '2015-04-01',
};

export const currentBoard: User = {
  id: 'bd1',
  name: 'Nakamura Yuki',
  email: 'yuki.n@inkflow-board.jp',
  role: 'board',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format',
  bio: 'Giám đốc Hội đồng Biên tập InkFlow. 15 năm kinh nghiệm trong ngành xuất bản manga. Chịu trách nhiệm phê duyệt series mới, quản lý lịch xuất bản và quyết định chiến lược phát triển.',
  joinDate: '2012-01-15',
  specialties: ['Editorial Strategy', 'Publishing', 'Series Development'],
};

export const currentAdmin: User = {
  id: 'ad1',
  name: 'Sato Kenji',
  email: 'admin@mangaflow.jp',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&auto=format',
  bio: 'System Administrator of MangaFlow. Responsible for user management, system configuration, and platform security.',
  joinDate: '2020-01-01',
};

export const assistants: User[] = [
  {
    id: 'a1',
    name: 'Yamamoto Keiko',
    email: 'keiko.y@inkstudio.jp',
    role: 'assistant',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format',
    bio: 'Specializes in background art and environmental design.',
    joinDate: '2021-06-10',
    specialties: ['Background', 'Screentone'],
  },
  {
    id: 'a2',
    name: 'Suzuki Ryo',
    email: 'ryo.s@inkstudio.jp',
    role: 'assistant',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
    bio: 'Expert in shading and tonal work for action sequences.',
    joinDate: '2020-11-22',
    specialties: ['Shading', 'Effect'],
  },
  {
    id: 'a3',
    name: 'Park Ji-young',
    email: 'jiyoung.p@inkstudio.jp',
    role: 'assistant',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    bio: 'Clean line specialist and character detail artist.',
    joinDate: '2022-02-08',
    specialties: ['Clean Line', 'Screentone'],
  },
  {
    id: 'a4',
    name: 'Chen Wei',
    email: 'chen.w@inkstudio.jp',
    role: 'assistant',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    bio: 'Special effects and action lines expert.',
    joinDate: '2021-09-14',
    specialties: ['Effect', 'Shading'],
  },
];

// ─── Series ──────────────────────────────────────────────────────────────────

export const series: Series[] = [
  {
    id: 's1',
    title: 'Voidwalker Chronicles',
    genre: 'Action / Supernatural',
    genres: ['Action', 'Supernatural', 'Mystery'],
    status: 'In Progress',
    synopsis: 'A former detective with the ability to step between dimensions hunts down entities that bleed through the void — beings that wear human faces but consume souls. When his partner becomes the next victim, the line between hunter and hunted dissolves.',
    targetAudience: 'Seinen (18-35)',
    publishingType: 'Weekly',
    currentRank: 3,
    previousRank: 5,
    voteScore: 48720,
    chaptersCount: 4,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=280&h=380&fit=crop&auto=format',
    mangakaId: 'u1',
    createdAt: '2024-01-10',
    updatedAt: '2025-05-18',
    isAtRisk: false,
  },
  {
    id: 's2',
    title: 'Scarlet Ronin',
    genre: 'Historical / Drama',
    genres: ['Historical', 'Drama', 'Action'],
    status: 'Approved',
    synopsis: 'Set in a fictionalized Edo period, a disgraced samurai branded a traitor searches for the lord who framed her — carrying only a broken blade and a debt written in blood.',
    targetAudience: 'Josei (20-40)',
    publishingType: 'Bi-weekly',
    currentRank: 7,
    previousRank: 6,
    voteScore: 31540,
    chaptersCount: 3,
    coverUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=280&h=380&fit=crop&auto=format',
    mangakaId: 'u1',
    createdAt: '2024-04-20',
    updatedAt: '2025-05-10',
    isAtRisk: false,
  },
  {
    id: 's3',
    title: 'Ghost Protocol 404',
    genre: 'Sci-fi / Thriller',
    genres: ['Sci-fi', 'Thriller', 'Cyberpunk'],
    status: 'At Risk',
    synopsis: 'In 2071, a data ghost — the rogue digital echo of a murdered hacker — infiltrates the surveillance systems of the megacity that killed her, leaving a trail of corrupted code and impossible crimes.',
    targetAudience: 'Seinen (20-30)',
    publishingType: 'Monthly',
    currentRank: 12,
    previousRank: 9,
    voteScore: 19880,
    chaptersCount: 3,
    coverUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=280&h=380&fit=crop&auto=format',
    mangakaId: 'u1',
    createdAt: '2023-09-05',
    updatedAt: '2025-04-28',
    isAtRisk: true,
  },
  {
    id: 's4',
    title: 'The Ember Alchemist',
    genre: 'Fantasy / Adventure',
    genres: ['Fantasy', 'Adventure'],
    status: 'Draft',
    synopsis: 'A young alchemist discovers that the legendary Philosopher\'s Stone is not an object but a living entity — one that has been waiting inside her bloodline for three centuries.',
    targetAudience: 'Shōnen (12-18)',
    publishingType: 'Weekly',
    currentRank: 0,
    previousRank: 0,
    voteScore: 0,
    chaptersCount: 1,
    coverUrl: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=280&h=380&fit=crop&auto=format',
    mangakaId: 'u1',
    createdAt: '2025-03-01',
    updatedAt: '2025-05-20',
    isAtRisk: false,
  },
];

// ─── Chapters ─────────────────────────────────────────────────────────────────

export const chapters: Chapter[] = [
  // Voidwalker Chronicles chapters
  { id: 'ch1', seriesId: 's1', number: 1, title: 'The First Step Into Nothing', deadline: '2025-03-15', progress: 100, status: 'Published', pagesCount: 24, description: 'Detective Kaoru steps through the void for the first time and confronts a mimicking entity.', createdAt: '2024-01-15' },
  { id: 'ch2', seriesId: 's1', number: 2, title: 'Faces Without Shadows', deadline: '2025-04-12', progress: 100, status: 'Published', pagesCount: 22, description: 'The entity\'s victims are discovered — all share one uncanny feature.', createdAt: '2024-02-01' },
  { id: 'ch3', seriesId: 's1', number: 3, title: 'Partner', deadline: '2025-05-20', progress: 78, status: 'In Progress', pagesCount: 26, description: 'Kaoru\'s partner Emi begins acting strangely after a routine investigation.', createdAt: '2024-03-10' },
  { id: 'ch4', seriesId: 's1', number: 4, title: 'Edge of the Familiar', deadline: '2025-06-18', progress: 25, status: 'Draft', pagesCount: 24, description: 'The truth behind Emi\'s transformation forces Kaoru to make an impossible choice.', createdAt: '2025-04-20' },

  // Scarlet Ronin chapters
  { id: 'ch5', seriesId: 's2', number: 1, title: 'The Brand of Cowardice', deadline: '2025-03-01', progress: 100, status: 'Published', pagesCount: 28, description: 'Akane is stripped of her title and cast out by the very lord she served.', createdAt: '2024-04-25' },
  { id: 'ch6', seriesId: 's2', number: 2, title: 'Red on Snow', deadline: '2025-04-20', progress: 100, status: 'Approved', pagesCount: 26, description: 'A mountain village becomes the site of her first confrontation on the road to vengeance.', createdAt: '2024-06-01' },
  { id: 'ch7', seriesId: 's2', number: 3, title: 'The Merchant of Debts', deadline: '2025-06-05', progress: 52, status: 'In Progress', pagesCount: 26, description: 'Akane encounters a mysterious merchant who deals in information — and secrets.', createdAt: '2024-08-15' },

  // Ghost Protocol 404 chapters
  { id: 'ch8', seriesId: 's3', number: 1, title: 'System Intrusion', deadline: '2024-12-01', progress: 100, status: 'Published', pagesCount: 30, description: 'Ghost 404 awakens inside the city\'s mainframe and begins her mission.', createdAt: '2023-09-10' },
  { id: 'ch9', seriesId: 's3', number: 2, title: 'Corrupted Memory', deadline: '2025-02-15', progress: 100, status: 'Published', pagesCount: 28, description: 'Piecing together fragmented data reveals a conspiracy at the highest levels.', createdAt: '2023-11-20' },
  { id: 'ch10', seriesId: 's3', number: 3, title: 'Null Zone', deadline: '2025-05-30', progress: 40, status: 'In Progress', pagesCount: 30, description: 'Ghost discovers a section of the city network that shouldn\'t exist.', createdAt: '2024-04-01' },

  // Ember Alchemist chapters
  { id: 'ch11', seriesId: 's4', number: 1, title: 'The Stone Bleeds', deadline: '2025-07-10', progress: 15, status: 'Draft', pagesCount: 24, description: 'Mira discovers her grandmother\'s journal and the secret inheritance within her blood.', createdAt: '2025-03-05' },
];

// ─── Manga Pages ──────────────────────────────────────────────────────────────

export const mangaPages: MangaPage[] = [
  // Chapter 3 pages (Voidwalker Ch3 - in progress)
  { id: 'p1', chapterId: 'ch3', pageNumber: 1, status: 'Completed', tasksCount: 2, completedTasksCount: 2, panelLayout: 0 },
  { id: 'p2', chapterId: 'ch3', pageNumber: 2, status: 'Completed', tasksCount: 3, completedTasksCount: 3, panelLayout: 1 },
  { id: 'p3', chapterId: 'ch3', pageNumber: 3, status: 'In Progress', tasksCount: 4, completedTasksCount: 2, panelLayout: 2 },
  { id: 'p4', chapterId: 'ch3', pageNumber: 4, status: 'In Progress', tasksCount: 3, completedTasksCount: 1, panelLayout: 0 },
  { id: 'p5', chapterId: 'ch3', pageNumber: 5, status: 'Draft', tasksCount: 0, completedTasksCount: 0, panelLayout: 3 },
  { id: 'p6', chapterId: 'ch3', pageNumber: 6, status: 'Draft', tasksCount: 0, completedTasksCount: 0, panelLayout: 1 },

  // Chapter 7 pages (Scarlet Ronin Ch3 - in progress)
  { id: 'p7', chapterId: 'ch7', pageNumber: 1, status: 'Completed', tasksCount: 2, completedTasksCount: 2, panelLayout: 0 },
  { id: 'p8', chapterId: 'ch7', pageNumber: 2, status: 'In Progress', tasksCount: 3, completedTasksCount: 1, panelLayout: 2 },
  { id: 'p9', chapterId: 'ch7', pageNumber: 3, status: 'Draft', tasksCount: 1, completedTasksCount: 0, panelLayout: 1 },

  // Chapter 10 pages (Ghost Protocol Ch3 - in progress)
  { id: 'p10', chapterId: 'ch10', pageNumber: 1, status: 'Completed', tasksCount: 3, completedTasksCount: 3, panelLayout: 3 },
  { id: 'p11', chapterId: 'ch10', pageNumber: 2, status: 'In Progress', tasksCount: 4, completedTasksCount: 2, panelLayout: 0 },
  { id: 'p12', chapterId: 'ch10', pageNumber: 3, status: 'Draft', tasksCount: 2, completedTasksCount: 0, panelLayout: 2 },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks: Task[] = [
  {
    id: 't1', pageId: 'p3', chapterId: 'ch3', seriesId: 's1',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner', pageNumber: 3,
    title: 'BG: Detective Office Interior',
    type: 'Background', assistantId: 'a1',
    description: 'Draw the full detective office background for the top panel. Include cluttered desk, corkboard with case notes, fluorescent overhead lighting. Reference: noir film style, heavy shadows.',
    deadline: '2025-05-28', price: 4500, status: 'Submitted',
    region: { x: 5, y: 5, width: 90, height: 35 },
    submittedResult: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    createdAt: '2025-05-10',
  },
  {
    id: 't2', pageId: 'p3', chapterId: 'ch3', seriesId: 's1',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner', pageNumber: 3,
    title: 'FX: Void Rift Effect',
    type: 'Effect', assistantId: 'a2',
    description: 'Add the void rift effect in the lower-right panel. Swirling dark energy with corrupted light beams. Use heavy black feathering outward.',
    deadline: '2025-05-30', price: 3200, status: 'In Progress',
    region: { x: 55, y: 60, width: 40, height: 35 },
    createdAt: '2025-05-12',
  },
  {
    id: 't3', pageId: 'p4', chapterId: 'ch3', seriesId: 's1',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner', pageNumber: 4,
    title: 'Screentone: Night City Street',
    type: 'Screentone', assistantId: 'a3',
    description: 'Apply screentone to the night street panels. Use dot gradients for lighting halos around streetlamps. Keep it authentic to classic manga toning.',
    deadline: '2025-06-02', price: 2800, status: 'Approved',
    region: { x: 5, y: 5, width: 90, height: 55 },
    createdAt: '2025-05-08',
  },
  {
    id: 't4', pageId: 'p8', chapterId: 'ch7', seriesId: 's2',
    seriesTitle: 'Scarlet Ronin', chapterTitle: 'The Merchant of Debts', pageNumber: 2,
    title: 'Shading: Akane Combat Sequence',
    type: 'Shading', assistantId: 'a2',
    description: 'Add shading to Akane\'s figure in the combat sequence panels. Focus on dramatic cross-hatching for the sword movement lines. The lighting source is moonlight from upper left.',
    deadline: '2025-06-08', price: 3800, status: 'Revision Required',
    region: { x: 10, y: 5, width: 80, height: 60 },
    submittedResult: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    mangakaFeedback: 'The cross-hatching on the sword arm is too dense — losing the form. Please lighten the mid-tone areas and keep the deepest blacks only in shadow cores.',
    createdAt: '2025-05-05',
  },
  {
    id: 't5', pageId: 'p1', chapterId: 'ch3', seriesId: 's1',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner', pageNumber: 1,
    title: 'Clean Line: Chapter Opening Splash',
    type: 'Clean Line', assistantId: 'a3',
    description: 'Clean up the rough pencils for the chapter opening double-page splash. Focus on character lines and panel borders.',
    deadline: '2025-05-15', price: 5500, status: 'Approved',
    region: { x: 0, y: 0, width: 100, height: 100 },
    createdAt: '2025-04-28',
  },
  {
    id: 't6', pageId: 'p11', chapterId: 'ch10', seriesId: 's3',
    seriesTitle: 'Ghost Protocol 404', chapterTitle: 'Null Zone', pageNumber: 2,
    title: 'BG: Server Farm Environment',
    type: 'Background', assistantId: 'a1',
    description: 'Cyberpunk server farm background. Rows of glowing server racks, cable bundles, holographic displays. Blue-green neon lighting scheme.',
    deadline: '2025-06-10', price: 5200, status: 'Pending',
    region: { x: 5, y: 5, width: 90, height: 40 },
    createdAt: '2025-05-18',
  },
  {
    id: 't7', pageId: 'p2', chapterId: 'ch3', seriesId: 's1',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner', pageNumber: 2,
    title: 'Dialogue Edit: Interrogation Scene',
    type: 'Dialogue Edit', assistantId: 'a4',
    description: 'Review and touch up dialogue bubble placement in the interrogation scene. Ensure reading flow is correct L→R, bubbles don\'t obscure character faces.',
    deadline: '2025-05-22', price: 1500, status: 'Approved',
    region: { x: 20, y: 30, width: 60, height: 40 },
    createdAt: '2025-05-02',
  },
  {
    id: 't8', pageId: 'p9', chapterId: 'ch7', seriesId: 's2',
    seriesTitle: 'Scarlet Ronin', chapterTitle: 'The Merchant of Debts', pageNumber: 3,
    title: 'BG: Merchant Quarter Street',
    type: 'Background', assistantId: 'a1',
    description: 'Edo period merchant district. Lantern-lit street, shop banners, cobblestone path. Evening atmosphere.',
    deadline: '2025-06-15', price: 4200, status: 'Pending',
    region: { x: 5, y: 5, width: 90, height: 50 },
    createdAt: '2025-05-20',
  },
];

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissions: Submission[] = [
  {
    id: 'sub1', seriesId: 's1', seriesTitle: 'Voidwalker Chronicles',
    submittedDate: '2024-01-10',
    status: 'Approved',
    boardDecision: 'Approved for immediate serialization. Strong premise and distinctive visual language.',
    feedback: 'The supernatural detective concept is compelling. Ensure the pacing maintains tension through the first arc.',
  },
  {
    id: 'sub2', seriesId: 's2', seriesTitle: 'Scarlet Ronin',
    submittedDate: '2024-04-20',
    status: 'Approved',
    boardDecision: 'Approved with minor revision requests on chapter 1 pacing.',
    feedback: 'The female lead is fresh and the historical setting is well-researched. Chapter 1 needs tighter action choreography.',
  },
  {
    id: 'sub3', seriesId: 's3', seriesTitle: 'Ghost Protocol 404',
    submittedDate: '2023-09-05',
    status: 'Approved',
    boardDecision: 'Approved for monthly serialization track.',
    feedback: 'Strong sci-fi concept. Monthly schedule given the density of the panels. Please maintain consistency in the ghost\'s visual design.',
  },
  {
    id: 'sub4', seriesId: 's3', seriesTitle: 'Ghost Protocol 404',
    submittedDate: '2025-03-01',
    status: 'Revision Required',
    boardDecision: 'Chapter 3 submission requires revisions before approval.',
    feedback: 'The null zone concept needs clearer visual differentiation from the main cyberspace scenes. Readers are losing spatial orientation. Resubmit with distinct visual language for the null zone environment.',
  },
  {
    id: 'sub5', seriesId: 's4', seriesTitle: 'The Ember Alchemist',
    submittedDate: '2025-03-15',
    status: 'Pending',
    boardDecision: undefined,
    feedback: undefined,
  },
  {
    id: 'sub6', seriesId: 's1', seriesTitle: 'Voidwalker Chronicles',
    submittedDate: '2025-04-10',
    status: 'Approved',
    boardDecision: 'Chapter arc 2 approved. Ranking performance has been excellent.',
    feedback: 'Excellent work maintaining the momentum from arc 1. The Emi subplot is building beautifully.',
  },
];

// ─── Rankings ─────────────────────────────────────────────────────────────────

export const rankings: SeriesRanking[] = [
  {
    seriesId: 's1', currentRank: 3, previousRank: 5,
    voteScore: 48720, trend: 'up', isAtRisk: false,
    history: [
      { week: 'W1 Apr', rank: 8, votes: 28400 },
      { week: 'W2 Apr', rank: 7, votes: 31200 },
      { week: 'W3 Apr', rank: 6, votes: 35800 },
      { week: 'W4 Apr', rank: 5, votes: 39100 },
      { week: 'W1 May', rank: 4, votes: 42600 },
      { week: 'W2 May', rank: 5, votes: 40200 },
      { week: 'W3 May', rank: 4, votes: 44800 },
      { week: 'W4 May', rank: 3, votes: 48720 },
    ],
  },
  {
    seriesId: 's2', currentRank: 7, previousRank: 6,
    voteScore: 31540, trend: 'down', isAtRisk: false,
    history: [
      { week: 'W1 Apr', rank: 5, votes: 36200 },
      { week: 'W2 Apr', rank: 5, votes: 35800 },
      { week: 'W3 Apr', rank: 6, votes: 33400 },
      { week: 'W4 Apr', rank: 5, votes: 34900 },
      { week: 'W1 May', rank: 6, votes: 32800 },
      { week: 'W2 May', rank: 6, votes: 31900 },
      { week: 'W3 May', rank: 6, votes: 32100 },
      { week: 'W4 May', rank: 7, votes: 31540 },
    ],
  },
  {
    seriesId: 's3', currentRank: 12, previousRank: 9,
    voteScore: 19880, trend: 'down', isAtRisk: true,
    history: [
      { week: 'W1 Apr', rank: 8, votes: 27400 },
      { week: 'W2 Apr', rank: 9, votes: 25200 },
      { week: 'W3 Apr', rank: 9, votes: 24100 },
      { week: 'W4 Apr', rank: 10, votes: 22800 },
      { week: 'W1 May', rank: 10, votes: 22100 },
      { week: 'W2 May', rank: 11, votes: 21300 },
      { week: 'W3 May', rank: 11, votes: 20500 },
      { week: 'W4 May', rank: 12, votes: 19880 },
    ],
  },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: 'n1', type: 'task_submitted', read: false,
    title: 'Task Submitted for Review',
    message: 'Yamamoto Keiko submitted "BG: Detective Office Interior" for your review.',
    createdAt: '2025-05-22T09:14:00Z',
    linkTo: '/mangaka/tasks/t1/review',
  },
  {
    id: 'n2', type: 'ranking_alert', read: false,
    title: 'Ranking Alert — Ghost Protocol 404',
    message: 'Ghost Protocol 404 has dropped to rank #12. Series is now flagged At Risk. Consider pushing Chapter 3 to boost engagement.',
    createdAt: '2025-05-21T18:00:00Z',
    linkTo: '/mangaka/series/s3/ranking',
  },
  {
    id: 'n3', type: 'deadline_warning', read: false,
    title: 'Deadline in 3 Days',
    message: 'Chapter 3 "Partner" of Voidwalker Chronicles is due on May 28th. Progress: 78%.',
    createdAt: '2025-05-21T08:00:00Z',
    linkTo: '/mangaka/series/s1/chapters',
  },
  {
    id: 'n4', type: 'submission_update', read: true,
    title: 'Submission Approved',
    message: 'The editorial board approved your submission for Voidwalker Chronicles (Arc 2). Serialization continues.',
    createdAt: '2025-05-20T14:30:00Z',
    linkTo: '/mangaka/submissions',
  },
  {
    id: 'n5', type: 'revision_required', read: true,
    title: 'Revision Requested',
    message: 'Suzuki Ryo\'s shading task for Scarlet Ronin Ch3 Page 2 has been revised. Awaiting resubmission.',
    createdAt: '2025-05-19T11:00:00Z',
    linkTo: '/mangaka/tasks/t4/review',
  },
  {
    id: 'n6', type: 'task_approved', read: true,
    title: 'Task Approved',
    message: 'Park Ji-young\'s screentone task for Voidwalker Chronicles Ch3 Page 4 has been approved.',
    createdAt: '2025-05-18T16:45:00Z',
    linkTo: '/mangaka/tasks/t3/review',
  },
  {
    id: 'n7', type: 'deadline_warning', read: true,
    title: 'Upcoming Deadline',
    message: 'Scarlet Ronin Chapter 3 deadline is June 5th. Current progress: 52%.',
    createdAt: '2025-05-17T08:00:00Z',
  },
  {
    id: 'n8', type: 'task_submitted', read: true,
    title: 'Task Submitted',
    message: 'Chen Wei submitted "Dialogue Edit: Interrogation Scene" for Voidwalker Chronicles.',
    createdAt: '2025-05-16T13:20:00Z',
    linkTo: '/mangaka/tasks/t7/review',
  },
];

// ─── Assistant Data ───────────────────────────────────────────────────────────

export const assistantIncome: AssistantIncome[] = [
  {
    id: 'inc1', taskId: 't3', taskTitle: 'Screentone: Night City Street',
    seriesTitle: 'Voidwalker Chronicles', approvedDate: '2025-05-10',
    price: 2800, paymentStatus: 'Paid',
  },
  {
    id: 'inc2', taskId: 't5', taskTitle: 'Clean Line: Chapter Opening Splash',
    seriesTitle: 'Voidwalker Chronicles', approvedDate: '2025-05-16',
    price: 5500, paymentStatus: 'Paid',
  },
  {
    id: 'inc3', taskId: 't7', taskTitle: 'Dialogue Edit: Interrogation Scene',
    seriesTitle: 'Voidwalker Chronicles', approvedDate: '2025-05-23',
    price: 1500, paymentStatus: 'Pending',
  },
  {
    id: 'inc4', taskId: 't1', taskTitle: 'BG: Detective Office Interior',
    seriesTitle: 'Voidwalker Chronicles', approvedDate: '2025-05-24',
    price: 4500, paymentStatus: 'Pending',
  },
];

export const assistantCalendar: AssistantCalendarEvent[] = [
  {
    id: 'cal1', taskId: 't1', taskTitle: 'BG: Detective Office Interior',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner',
    deadline: '2025-05-28', isOverdue: false,
  },
  {
    id: 'cal2', taskId: 't2', taskTitle: 'FX: Void Rift Effect',
    seriesTitle: 'Voidwalker Chronicles', chapterTitle: 'Partner',
    deadline: '2025-05-30', isOverdue: false,
  },
  {
    id: 'cal3', taskId: 't6', taskTitle: 'BG: Server Farm Environment',
    seriesTitle: 'Ghost Protocol 404', chapterTitle: 'Null Zone',
    deadline: '2025-06-10', isOverdue: false,
  },
  {
    id: 'cal4', taskId: 't8', taskTitle: 'BG: Merchant Quarter Street',
    seriesTitle: 'Scarlet Ronin', chapterTitle: 'The Merchant of Debts',
    deadline: '2025-06-15', isOverdue: false,
  },
];

// ─── Editor Data ──────────────────────────────────────────────────────────────

export const annotations: Annotation[] = [
  {
    id: 'ann1', chapterId: 'ch3', pageId: 'p3', editorId: 'e1',
    type: 'Panel Layout', priority: 'High',
    comment: 'Panel cuối cùng quá nhỏ, khó đọc. Cần mở rộng hoặc chia thành 2 panels.',
    suggestedChange: 'Tách thành 2 panels hoặc phóng to panel này lên 40%.',
    region: { x: 55, y: 60, width: 40, height: 35 },
    createdAt: '2025-05-20T14:30:00Z',
  },
  {
    id: 'ann2', chapterId: 'ch3', pageId: 'p3', editorId: 'e1',
    type: 'Dialogue', priority: 'Medium',
    comment: 'Dialogue bubble quá dài, cần tách thành 2 bubbles để dễ đọc hơn.',
    region: { x: 10, y: 45, width: 35, height: 20 },
    createdAt: '2025-05-20T14:35:00Z',
  },
  {
    id: 'ann3', chapterId: 'ch3', pageId: 'p4', editorId: 'e1',
    type: 'Character', priority: 'Critical',
    comment: 'Biểu cảm của Emi không match với dialogue. Cần sửa lại expression.',
    suggestedChange: 'Đổi thành biểu cảm lo lắng thay vì bất ngờ.',
    region: { x: 20, y: 15, width: 30, height: 35 },
    createdAt: '2025-05-21T10:00:00Z',
  },
];

export const editorReviews: EditorReview[] = [
  {
    id: 'rev1', chapterId: 'ch3', seriesId: 's1', editorId: 'e1',
    status: 'In Review', annotationsCount: 3,
    submittedDate: '2025-05-19', reviewedDate: undefined,
  },
  {
    id: 'rev2', chapterId: 'ch2', seriesId: 's1', editorId: 'e1',
    status: 'Approved', annotationsCount: 0,
    submittedDate: '2025-04-10', reviewedDate: '2025-04-12',
    overallComment: 'Chapter xuất sắc, pacing rất tốt. Approved ngay.',
  },
  {
    id: 'rev3', chapterId: 'ch7', seriesId: 's2', editorId: 'e1',
    status: 'Revision Required', annotationsCount: 5,
    submittedDate: '2025-05-15', reviewedDate: '2025-05-18',
    overallComment: 'Cần sửa một số panels và dialogue. Xem annotations để biết chi tiết.',
  },
];

export const editorNotes: EditorNote[] = [
  {
    id: 'note1', seriesId: 's1', chapterId: 'ch4', editorId: 'e1',
    type: 'Story concern', title: 'Mystery element cần làm rõ hơn',
    content: 'Chapter 4 cần reveal thêm manh mối về void entities. Độc giả đang có dấu hiệu bối rối về worldbuilding.',
    priority: 'High', createdAt: '2025-05-18',
  },
  {
    id: 'note2', seriesId: 's3', editorId: 'e1',
    type: 'Ranking concern', title: 'Ghost Protocol ranking giảm liên tục',
    content: 'Series đã drop từ rank 9 xuống 12 trong 4 tuần. Cần thảo luận với mangaka về cách boost engagement. Có thể cần action sequence lớn hơn.',
    priority: 'Critical', createdAt: '2025-05-21',
  },
  {
    id: 'note3', seriesId: 's2', chapterId: 'ch7', editorId: 'e1',
    type: 'Meeting note', title: 'Meeting với Tanaka-sensei 2025-05-20',
    content: 'Đã thảo luận về direction của arc 2. Mangaka đồng ý thêm subplot về quá khứ của Akane. Target chapter 9-10.',
    priority: 'Medium', createdAt: '2025-05-20',
  },
];

export const deadlineInfos: DeadlineInfo[] = [
  {
    id: 'dl1', seriesId: 's1', chapterId: 'ch3',
    deadline: '2025-05-28', progress: 78, riskLevel: 'Medium',
  },
  {
    id: 'dl2', seriesId: 's2', chapterId: 'ch7',
    deadline: '2025-06-05', progress: 52, riskLevel: 'High',
  },
  {
    id: 'dl3', seriesId: 's3', chapterId: 'ch10',
    deadline: '2025-05-30', progress: 40, riskLevel: 'Critical',
  },
  {
    id: 'dl4', seriesId: 's1', chapterId: 'ch4',
    deadline: '2025-06-18', progress: 25, riskLevel: 'Low',
  },
];

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const MOCK_CREDENTIALS = {
  mangaka: {
    email: 'hiroshi.tanaka@inkflow.jp',
    password: 'mangaka123',
  },
  assistant: {
    email: 'keiko.y@inkstudio.jp',
    password: 'assistant123',
  },
  editor: {
    email: 'akira.k@inkflow-editorial.jp',
    password: 'editor123',
  },
  board: {
    email: 'yuki.n@inkflow-board.jp',
    password: 'board123',
  },
  admin: {
    email: 'admin@mangaflow.jp',
    password: 'admin123',
  },
};

export function loginUser(email: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === MOCK_CREDENTIALS.mangaka.email.toLowerCase() && password === MOCK_CREDENTIALS.mangaka.password) {
    localStorage.setItem('inkflow_user', JSON.stringify(currentUser));
    return currentUser;
  }
  if (normalizedEmail === MOCK_CREDENTIALS.assistant.email.toLowerCase() && password === MOCK_CREDENTIALS.assistant.password) {
    localStorage.setItem('inkflow_user', JSON.stringify(currentAssistant));
    return currentAssistant;
  }
  if (normalizedEmail === MOCK_CREDENTIALS.editor.email.toLowerCase() && password === MOCK_CREDENTIALS.editor.password) {
    localStorage.setItem('inkflow_user', JSON.stringify(currentEditor));
    return currentEditor;
  }
  if (normalizedEmail === MOCK_CREDENTIALS.board.email.toLowerCase() && password === MOCK_CREDENTIALS.board.password) {
    localStorage.setItem('inkflow_user', JSON.stringify(currentBoard));
    return currentBoard;
  }
  if (normalizedEmail === MOCK_CREDENTIALS.admin.email.toLowerCase() && password === MOCK_CREDENTIALS.admin.password) {
    localStorage.setItem('inkflow_user', JSON.stringify(currentAdmin));
    return currentAdmin;
  }
  return null;
}

type ApiAuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    role: User['role'] | string;
  };
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5120').replace(/\/$/, '');

function normalizeRole(role: string): User['role'] {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'assistant' || normalized === 'editor' || normalized === 'board') {
    return normalized;
  }
  return 'mangaka';
}

function saveAuthSession(response: ApiAuthResponse): User {
  const user: User = {
    id: response.user.id,
    name: response.user.fullName || response.user.email || 'MangaFlow User',
    email: response.user.email ?? '',
    role: normalizeRole(response.user.role),
    avatar: response.user.avatarUrl ?? '',
    bio: '',
    joinDate: new Date().toISOString().slice(0, 10),
  };

  localStorage.setItem('inkflow_user', JSON.stringify(user));
  localStorage.setItem('inkflow_access_token', response.accessToken);
  localStorage.setItem('inkflow_refresh_token', response.refreshToken);
  return user;
}

export async function loginUserWithApi(email: string, password: string): Promise<User | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  if (!response.ok) {
    return null;
  }

  return saveAuthSession(await response.json());
}

export function logoutUser(): void {
  localStorage.removeItem('inkflow_user');
  localStorage.removeItem('inkflow_access_token');
  localStorage.removeItem('inkflow_refresh_token');
}

export function getLoggedInUser(): User | null {
  try {
    const raw = localStorage.getItem('inkflow_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Helper lookups ───────────────────────────────────────────────────────────

export function getSeriesById(id: string): Series | undefined {
  return series.find(s => s.id === id);
}

export function getChaptersBySeriesId(seriesId: string): Chapter[] {
  return chapters.filter(c => c.seriesId === seriesId);
}

export function getChapterById(id: string): Chapter | undefined {
  return chapters.find(c => c.id === id);
}

export function getPagesByChapterId(chapterId: string): MangaPage[] {
  return mangaPages.filter(p => p.chapterId === chapterId);
}

export function getPageById(id: string): MangaPage | undefined {
  return mangaPages.find(p => p.id === id);
}

export function getTasksByPageId(pageId: string): Task[] {
  return tasks.filter(t => t.pageId === pageId);
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find(t => t.id === id);
}

export function createMockTaskForPage(input: {
  pageId: string;
  type: TaskType;
  assistantId: string;
  description: string;
  deadline: string;
  price: number;
  region: Task['region'];
}): Task | undefined {
  const page = getPageById(input.pageId);
  if (!page) return undefined;

  const chapter = getChapterById(page.chapterId);
  if (!chapter) return undefined;

  const taskSeries = getSeriesById(chapter.seriesId);
  if (!taskSeries) return undefined;

  const nextTask: Task = {
    id: `t${Date.now()}`,
    pageId: page.id,
    chapterId: chapter.id,
    seriesId: taskSeries.id,
    seriesTitle: taskSeries.title,
    chapterTitle: chapter.title,
    pageNumber: page.pageNumber,
    title: `${input.type}: Page ${page.pageNumber} area`,
    type: input.type,
    assistantId: input.assistantId,
    description: input.description,
    deadline: input.deadline,
    price: input.price,
    status: 'Pending',
    region: input.region,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  tasks.unshift(nextTask);
  page.tasksCount += 1;
  return nextTask;
}

export function getAssistantById(id: string): User | undefined {
  return assistants.find(a => a.id === id);
}

export function getRankingBySeriesId(seriesId: string): SeriesRanking | undefined {
  return rankings.find(r => r.seriesId === seriesId);
}

export function getSubmissionsBySeriesId(seriesId: string): Submission[] {
  return submissions.filter(s => s.seriesId === seriesId);
}

export const upcomingDeadlines = chapters
  .filter(c => c.status !== 'Published' && c.status !== 'Approved')
  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  .slice(0, 5)
  .map(c => ({
    ...c,
    series: series.find(s => s.id === c.seriesId),
  }));

// ─── Assistant Helpers ────────────────────────────────────────────────────────

export function getTasksByAssistantId(assistantId: string): Task[] {
  return tasks.filter(t => t.assistantId === assistantId);
}

export function getTasksByStatus(assistantId: string, status: TaskStatus): Task[] {
  return tasks.filter(t => t.assistantId === assistantId && t.status === status);
}

export function getIncomeByAssistantId(assistantId: string): AssistantIncome[] {
  return assistantIncome;
}

export function getCalendarEventsByAssistantId(assistantId: string): AssistantCalendarEvent[] {
  return assistantCalendar;
}

export function getMonthlyIncome(assistantId: string, month: string): number {
  const income = assistantIncome.filter(i => i.approvedDate.startsWith(month));
  return income.reduce((sum, i) => sum + i.price, 0);
}

export function getPendingPaymentAmount(assistantId: string): number {
  const pending = assistantIncome.filter(i => i.paymentStatus === 'Pending');
  return pending.reduce((sum, i) => sum + i.price, 0);
}

// ─── Editor Helpers ───────────────────────────────────────────────────────────

export function getSeriesByEditorId(editorId: string): Series[] {
  // Editor phụ trách tất cả series của mangaka currentUser
  return series;
}

export function getChaptersNeedingReview(editorId: string): Chapter[] {
  // Lấy các chapter đang In Progress hoặc Draft
  return chapters.filter(c => c.status === 'In Progress' || c.status === 'Review');
}

export function getAnnotationsByChapterId(chapterId: string): Annotation[] {
  return annotations.filter(a => a.chapterId === chapterId);
}

export function getAnnotationsByPageId(pageId: string): Annotation[] {
  return annotations.filter(a => a.pageId === pageId);
}

export function getEditorReviewByChapterId(chapterId: string): EditorReview | undefined {
  return editorReviews.find(r => r.chapterId === chapterId);
}

export function getEditorNotesBySeriesId(seriesId: string): EditorNote[] {
  return editorNotes.filter(n => n.seriesId === seriesId);
}

export function getDeadlineInfoByChapterId(chapterId: string): DeadlineInfo | undefined {
  return deadlineInfos.find(d => d.chapterId === chapterId);
}

export function getAtRiskSeries(): Series[] {
  return series.filter(s => s.isAtRisk);
}

// ─── Board Types ──────────────────────────────────────────────────────────────

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

// ─── Board Mock Data ──────────────────────────────────────────────────────────

export const boardSubmissions: BoardSubmission[] = [
  {
    id: 'bs1',
    seriesTitle: 'Steel Horizon',
    mangakaName: 'Inoue Daiki',
    mangakaAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&auto=format',
    genre: 'Sci-Fi / Mecha',
    submittedDate: '2025-05-10',
    status: 'Pending Review',
    synopsis: 'Năm 2187, khi trái đất bị bao phủ bởi bão thép từ vũ trụ, một phi công trẻ phát hiện ra bí mật đằng sau cuộc xâm lược — và cái giá phải trả để cứu nhân loại là chính bản thân mình.',
    targetAudience: 'Shōnen (12-18)',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=280&h=380&fit=crop&auto=format',
    characters: [
      { name: 'Kaito Shiro', role: 'Nhân vật chính', description: 'Phi công thiên tài 17 tuổi, con trai của người tạo ra công nghệ mecha.' },
      { name: 'Aria-7', role: 'AI đối tác', description: 'Trí tuệ nhân tạo gắn liền với mecha của Kaito, mang cảm xúc con người.' },
      { name: 'General Ryuzaki', role: 'Đối thủ', description: 'Chỉ huy quân đội biến chất, tin rằng hy sinh là cần thiết cho chiến thắng.' },
    ],
    editorRecommendation: 'Series có concept độc đáo và nhân vật phát triển tốt. Pilot chapter thể hiện tiềm năng thương mại cao. Khuyến nghị phê duyệt với lịch Weekly.',
    editorName: 'Kobayashi Akira',
    voteResult: { approve: 3, reject: 0, moreInfo: 1 },
  },
  {
    id: 'bs2',
    seriesTitle: 'Crimson Petal',
    mangakaName: 'Fujiwara Mei',
    mangakaAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    genre: 'Romance / Drama',
    submittedDate: '2025-05-14',
    status: 'Pending Review',
    synopsis: 'Trong thế giới hiện đại, một nữ nhà văn nổi tiếng bí ẩn tình cờ gặp chàng trai từng là nguồn cảm hứng cho mọi câu chuyện của cô — người mà cô tưởng đã mất mãi mãi 7 năm trước.',
    targetAudience: 'Josei (18-30)',
    coverUrl: 'https://images.unsplash.com/photo-1490750967868-88df5691cc2c?w=280&h=380&fit=crop&auto=format',
    characters: [
      { name: 'Sakura Yuna', role: 'Nhân vật chính', description: 'Nhà văn 27 tuổi nổi tiếng với những câu chuyện tình lãng mạn nhưng lại né tránh tình yêu thật.' },
      { name: 'Kira Haruto', role: 'Nam chính', description: 'Kiến trúc sư điển trai, người mang bí ẩn về quá khứ chung với Yuna.' },
    ],
    editorRecommendation: 'Nội dung cảm xúc, phong cách vẽ tinh tế. Phù hợp với thị trường Josei đang tăng trưởng. Khuyến nghị phê duyệt Monthly.',
    editorName: 'Tanaka Reiko',
    voteResult: { approve: 2, reject: 1, moreInfo: 1 },
  },
  {
    id: 'bs3',
    seriesTitle: "Demon's Court",
    mangakaName: 'Watanabe Sho',
    mangakaAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    genre: 'Supernatural / Action',
    submittedDate: '2025-04-28',
    status: 'More Info Required',
    synopsis: 'Một luật sư trẻ phát hiện ra tòa án nơi anh làm việc thực ra là nơi phán xét linh hồn của thế giới người âm. Mỗi vụ án không chỉ quyết định số phận con người mà còn ảnh hưởng đến cân bằng giữa hai thế giới.',
    targetAudience: 'Seinen (20-35)',
    coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=280&h=380&fit=crop&auto=format',
    characters: [
      { name: 'Kudo Ren', role: 'Nhân vật chính', description: 'Luật sư 26 tuổi xuất sắc nhưng đang mắc kẹt giữa hai thế giới.' },
      { name: 'Lord Ashura', role: 'Đối tác bí ẩn', description: 'Quỷ tòa án có thể giúp Ren nhưng luôn có động cơ ẩn.' },
    ],
    editorRecommendation: 'Concept thú vị nhưng cần làm rõ hệ thống phép thuật và luật lệ của thế giới. Yêu cầu thêm 2 chapter pilot trước khi quyết định.',
    editorName: 'Mori Kenji',
    voteResult: { approve: 1, reject: 1, moreInfo: 3 },
  },
  {
    id: 'bs4',
    seriesTitle: 'Last Protocol',
    mangakaName: 'Hayashi Taro',
    mangakaAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
    genre: 'Thriller / Spy',
    submittedDate: '2025-04-15',
    status: 'Approved',
    synopsis: 'Đặc vụ bị xóa ký ức phải tìm lại danh tính trong 72 giờ trước khi tổ chức anh từng phục vụ tiêu diệt mọi dấu vết về anh.',
    targetAudience: 'Seinen (20-40)',
    coverUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=280&h=380&fit=crop&auto=format',
    characters: [
      { name: 'Agent Zero', role: 'Nhân vật chính', description: 'Đặc vụ hàng đầu không còn nhớ gì về bản thân.' },
      { name: 'Director Yama', role: 'Phản diện chính', description: 'Người đứng sau vụ xóa ký ức với âm mưu lớn hơn.' },
    ],
    editorRecommendation: 'Series xuất sắc, pace nhanh, hình ảnh ấn tượng. Khuyến nghị Weekly slot ưu tiên cao.',
    editorName: 'Kobayashi Akira',
    voteResult: { approve: 5, reject: 0, moreInfo: 0 },
  },
  {
    id: 'bs5',
    seriesTitle: 'Wandering Sage',
    mangakaName: 'Ito Naomi',
    mangakaAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format',
    genre: 'Slice of Life / Fantasy',
    submittedDate: '2025-03-20',
    status: 'Rejected',
    synopsis: 'Một nhà hiền triết già lang thang qua các làng nhỏ, giải quyết những rắc rối hàng ngày bằng phép thuật đơn giản và sự khôn ngoan của tuổi tác.',
    targetAudience: 'Seinen (25-50)',
    coverUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=280&h=380&fit=crop&auto=format',
    characters: [
      { name: 'Sage Hiroku', role: 'Nhân vật chính', description: 'Nhà hiền triết 200 tuổi với vẻ ngoài già nua nhưng tâm hồn trẻ trung.' },
    ],
    editorRecommendation: 'Phong cách nhẹ nhàng nhưng thiếu hook thương mại. Thị trường hiện tại cần series có drama mạnh hơn.',
    editorName: 'Sato Mika',
    voteResult: { approve: 1, reject: 4, moreInfo: 0 },
  },
];

export const boardVotes: BoardVote[] = [
  { id: 'bv1', submissionId: 'bs1', memberId: 'bd1', memberName: 'Nakamura Yuki', memberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format', decision: 'Approve', reason: 'Concept mạnh, thị trường mecha đang hồi sinh. Tiềm năng anime adaptation cao.', votedAt: '2025-05-15T10:30:00Z' },
  { id: 'bv2', submissionId: 'bs1', memberId: 'bd2', memberName: 'Yamazaki Hiroshi', memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format', decision: 'Approve', reason: 'Nhân vật AI thú vị, có chiều sâu cảm xúc tốt.', votedAt: '2025-05-15T14:20:00Z' },
  { id: 'bv3', submissionId: 'bs1', memberId: 'bd3', memberName: 'Ogawa Sachiko', memberAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format', decision: 'Approve', reason: 'Art style phù hợp thị hiếu độc giả trẻ.', votedAt: '2025-05-16T09:15:00Z' },
  { id: 'bv4', submissionId: 'bs1', memberId: 'bd4', memberName: 'Kato Daisuke', memberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format', decision: 'More Info', reason: 'Cần xem thêm world-building. Phần giải thích công nghệ còn mơ hồ.', votedAt: '2025-05-16T11:45:00Z' },
  { id: 'bv5', submissionId: 'bs2', memberId: 'bd1', memberName: 'Nakamura Yuki', memberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format', decision: 'Approve', reason: 'Romance quality cao, phù hợp với định hướng mở rộng thị trường nữ.', votedAt: '2025-05-17T10:00:00Z' },
  { id: 'bv6', submissionId: 'bs2', memberId: 'bd2', memberName: 'Yamazaki Hiroshi', memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format', decision: 'Reject', reason: 'Cốt truyện quá quen thuộc, thiếu yếu tố độc đáo để nổi bật.', votedAt: '2025-05-17T14:30:00Z' },
  { id: 'bv7', submissionId: 'bs2', memberId: 'bd3', memberName: 'Ogawa Sachiko', memberAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format', decision: 'Approve', reason: 'Phong cách vẽ đẹp, nhân vật nữ chính có personality rõ ràng.', votedAt: '2025-05-18T09:00:00Z' },
  { id: 'bv8', submissionId: 'bs2', memberId: 'bd4', memberName: 'Kato Daisuke', memberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format', decision: 'More Info', reason: 'Muốn xem thêm chapter để đánh giá pacing.', votedAt: '2025-05-18T11:00:00Z' },
];

export const publishingSchedules: PublishingSchedule[] = [
  { id: 'ps1', seriesId: 's1', seriesTitle: 'Voidwalker Chronicles', mangakaName: 'Tanaka Hiroshi', publishingType: 'Weekly', releaseDay: 'Thứ Hai', startDate: '2024-02-05', nextReleaseDate: '2025-06-02', status: 'Active', note: 'Ưu tiên slot đầu tuần' },
  { id: 'ps2', seriesId: 's2', seriesTitle: 'Scarlet Ronin', mangakaName: 'Tanaka Hiroshi', publishingType: 'Monthly', releaseDay: '15 hàng tháng', startDate: '2024-03-15', nextReleaseDate: '2025-06-15', status: 'Active' },
  { id: 'ps3', seriesId: 's3', seriesTitle: 'Neon Requiem', mangakaName: 'Tanaka Hiroshi', publishingType: 'Weekly', releaseDay: 'Thứ Tư', startDate: '2024-05-01', nextReleaseDate: '2025-06-04', status: 'Paused', note: 'Tác giả nghỉ sức khỏe, dự kiến tiếp tục tháng 7' },
  { id: 'ps4', seriesId: 'bs4', seriesTitle: 'Last Protocol', mangakaName: 'Hayashi Taro', publishingType: 'Weekly', releaseDay: 'Thứ Sáu', startDate: '2025-07-01', nextReleaseDate: '2025-07-04', status: 'Active', note: 'Series mới được phê duyệt, bắt đầu tháng 7' },
  { id: 'ps5', seriesId: 's4', seriesTitle: 'Clockwork Shrine', mangakaName: 'Tanaka Hiroshi', publishingType: 'Monthly', releaseDay: '1 hàng tháng', startDate: '2024-06-01', nextReleaseDate: '2025-07-01', status: 'Active' },
];

export const readerVoteInputs: ReaderVoteInput[] = [
  { id: 'rv1', issueNumber: 22, seriesId: 's1', seriesTitle: 'Voidwalker Chronicles', releaseDate: '2025-05-26', voteCount: 48720, readerScore: 9.4, comment: 'Kỳ này có nhiều vote nhất trong lịch sử series', inputDate: '2025-05-27' },
  { id: 'rv2', issueNumber: 22, seriesId: 's2', seriesTitle: 'Scarlet Ronin', releaseDate: '2025-05-15', voteCount: 31240, readerScore: 8.8, inputDate: '2025-05-27' },
  { id: 'rv3', issueNumber: 22, seriesId: 's3', seriesTitle: 'Neon Requiem', releaseDate: '2025-05-21', voteCount: 8320, readerScore: 6.2, comment: 'Giảm mạnh do series tạm dừng thông báo', inputDate: '2025-05-27' },
  { id: 'rv4', issueNumber: 21, seriesId: 's1', seriesTitle: 'Voidwalker Chronicles', releaseDate: '2025-05-19', voteCount: 45100, readerScore: 9.1, inputDate: '2025-05-20' },
  { id: 'rv5', issueNumber: 21, seriesId: 's2', seriesTitle: 'Scarlet Ronin', releaseDate: '2025-04-15', voteCount: 29800, readerScore: 8.5, inputDate: '2025-04-16' },
  { id: 'rv6', issueNumber: 20, seriesId: 's3', seriesTitle: 'Neon Requiem', releaseDate: '2025-05-07', voteCount: 12500, readerScore: 7.1, inputDate: '2025-05-08' },
  { id: 'rv7', issueNumber: 20, seriesId: 's1', seriesTitle: 'Voidwalker Chronicles', releaseDate: '2025-05-12', voteCount: 43200, readerScore: 8.9, inputDate: '2025-05-13' },
];

export const boardRankings: BoardRanking[] = [
  { id: 'br1', rank: 1, previousRank: 2, seriesTitle: 'Voidwalker Chronicles', mangakaName: 'Tanaka Hiroshi', voteScore: 48720, trend: 'up', status: 'Rising', publishingType: 'Weekly' },
  { id: 'br2', rank: 2, previousRank: 1, seriesTitle: 'Scarlet Ronin', mangakaName: 'Tanaka Hiroshi', voteScore: 31240, trend: 'down', status: 'Stable', publishingType: 'Monthly' },
  { id: 'br3', rank: 3, previousRank: 3, seriesTitle: 'Clockwork Shrine', mangakaName: 'Tanaka Hiroshi', voteScore: 24800, trend: 'stable', status: 'Stable', publishingType: 'Monthly' },
  { id: 'br4', rank: 4, previousRank: 6, seriesTitle: 'Last Protocol', mangakaName: 'Hayashi Taro', voteScore: 19600, trend: 'up', status: 'Rising', publishingType: 'Weekly' },
  { id: 'br5', rank: 5, previousRank: 4, seriesTitle: 'Mirror Blade', mangakaName: 'Oda Kenji', voteScore: 15400, trend: 'down', status: 'Stable', publishingType: 'Weekly' },
  { id: 'br6', rank: 6, previousRank: 5, seriesTitle: 'Phantom Circuit', mangakaName: 'Suzuki Ai', voteScore: 11200, trend: 'down', status: 'Stable', publishingType: 'Weekly' },
  { id: 'br7', rank: 7, previousRank: 7, seriesTitle: 'Neon Requiem', mangakaName: 'Tanaka Hiroshi', voteScore: 8320, trend: 'stable', status: 'At Risk', publishingType: 'Weekly' },
  { id: 'br8', rank: 8, previousRank: 8, seriesTitle: 'Salt and Ember', mangakaName: 'Nakamura Hana', voteScore: 6100, trend: 'stable', status: 'At Risk', publishingType: 'Monthly' },
  { id: 'br9', rank: 9, previousRank: 10, seriesTitle: 'Iron Covenant', mangakaName: 'Park Minjun', voteScore: 4800, trend: 'up', status: 'At Risk', publishingType: 'Weekly' },
  { id: 'br10', rank: 10, previousRank: 9, seriesTitle: 'The Pale Garden', mangakaName: 'Chen Ruoxi', voteScore: 3200, trend: 'down', status: 'At Risk', publishingType: 'Monthly' },
];

export const seriesDecisions: SeriesDecision[] = [
  {
    id: 'sd1',
    seriesId: 's3',
    seriesTitle: 'Neon Requiem',
    mangakaName: 'Tanaka Hiroshi',
    mangakaAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=280&h=380&fit=crop&auto=format',
    currentRank: 7,
    bottomRankingCount: 4,
    latestVoteScore: 8320,
    riskReason: 'Đã đứng trong top 10 cuối liên tục 4 tuần. Vote giảm 35% so với peak. Series tạm dừng ảnh hưởng nặng đến momentum.',
    rankingHistory: [
      { week: 'Tuần 18', rank: 3 }, { week: 'Tuần 19', rank: 5 }, { week: 'Tuần 20', rank: 6 },
      { week: 'Tuần 21', rank: 7 }, { week: 'Tuần 22', rank: 7 },
    ],
    voteHistory: [
      { issue: 18, score: 12800, date: '2025-04-28' }, { issue: 19, score: 11200, date: '2025-05-07' },
      { issue: 20, score: 10100, date: '2025-05-14' }, { issue: 21, score: 9400, date: '2025-05-21' },
      { issue: 22, score: 8320, date: '2025-05-27' },
    ],
    editorDefenseNote: 'Tác giả đang trong giai đoạn phục hồi sức khỏe. Series có fanbase trung thành và đã đặt nền móng tốt cho arc tiếp theo. Đề xuất chuyển sang Monthly để tác giả có thêm thời gian chuẩn bị chất lượng.',
    boardDiscussion: [
      { memberName: 'Nakamura Yuki', memberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format', comment: 'Fanbase vẫn active trên mạng xã hội. Chuyển Monthly là phương án hợp lý nhất.', timestamp: '2025-05-25T10:00:00Z' },
      { memberName: 'Yamazaki Hiroshi', memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format', comment: 'Đồng ý. Tác giả có track record tốt, nên cho cơ hội phục hồi.', timestamp: '2025-05-25T14:30:00Z' },
      { memberName: 'Kato Daisuke', memberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format', comment: 'Nếu Monthly sau 3 tháng không cải thiện thì phải xem xét lại.', timestamp: '2025-05-26T09:15:00Z' },
    ],
  },
  {
    id: 'sd2',
    seriesId: 'sd-s2',
    seriesTitle: 'Salt and Ember',
    mangakaName: 'Nakamura Hana',
    mangakaAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format',
    coverUrl: 'https://images.unsplash.com/photo-1490750967868-88df5691cc2c?w=280&h=380&fit=crop&auto=format',
    currentRank: 8,
    bottomRankingCount: 6,
    latestVoteScore: 6100,
    riskReason: 'Liên tục đứng hạng 8-10 trong 6 tháng. Vote không có dấu hiệu phục hồi. Editor defense không thuyết phục.',
    rankingHistory: [
      { week: 'Tuần 18', rank: 8 }, { week: 'Tuần 19', rank: 9 }, { week: 'Tuần 20', rank: 8 },
      { week: 'Tuần 21', rank: 8 }, { week: 'Tuần 22', rank: 8 },
    ],
    voteHistory: [
      { issue: 18, score: 7200, date: '2025-04-01' }, { issue: 19, score: 6800, date: '2025-05-01' },
      { issue: 20, score: 6500, date: '2025-05-15' }, { issue: 21, score: 6300, date: '2025-05-22' },
      { issue: 22, score: 6100, date: '2025-05-27' },
    ],
    editorDefenseNote: 'Series có core audience nhỏ nhưng trung thành. Nội dung chất lượng ổn định. Tuy nhiên thiếu viral moment để thu hút độc giả mới.',
    boardDiscussion: [
      { memberName: 'Ogawa Sachiko', memberAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format', comment: 'Xu hướng vote đang giảm dần, không có dấu hiệu đảo chiều.', timestamp: '2025-05-24T10:00:00Z' },
      { memberName: 'Nakamura Yuki', memberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format', comment: 'Nên thảo luận với tác giả về hướng kết thúc graceful.', timestamp: '2025-05-24T11:30:00Z' },
    ],
  },
  {
    id: 'sd3',
    seriesId: 'sd-s3',
    seriesTitle: 'The Pale Garden',
    mangakaName: 'Chen Ruoxi',
    mangakaAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    coverUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=280&h=380&fit=crop&auto=format',
    currentRank: 10,
    bottomRankingCount: 8,
    latestVoteScore: 3200,
    riskReason: 'Đứng hạng 10 liên tục 8 tuần. Vote dưới ngưỡng cho phép. Cần quyết định ngay.',
    rankingHistory: [
      { week: 'Tuần 18', rank: 10 }, { week: 'Tuần 19', rank: 10 }, { week: 'Tuần 20', rank: 10 },
      { week: 'Tuần 21', rank: 10 }, { week: 'Tuần 22', rank: 10 },
    ],
    voteHistory: [
      { issue: 14, score: 5100, date: '2025-03-01' }, { issue: 15, score: 4600, date: '2025-03-15' },
      { issue: 16, score: 4100, date: '2025-04-01' }, { issue: 17, score: 3600, date: '2025-04-15' },
      { issue: 18, score: 3200, date: '2025-05-01' },
    ],
    editorDefenseNote: 'Đây là series đầu tay của một mangaka có tiềm năng. Tuy nhiên execution chưa đủ mạnh để giữ độc giả. Đề xuất cho tác giả cơ hội pitch concept mới.',
    boardDiscussion: [
      { memberName: 'Kato Daisuke', memberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format', comment: 'Tác giả còn trẻ, nên cancel nhẹ nhàng và mở cơ hội cho series tiếp theo.', timestamp: '2025-05-23T09:00:00Z' },
      { memberName: 'Yamazaki Hiroshi', memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format', comment: 'Đồng ý cancel, nhưng cần hỗ trợ tác giả trong quá trình transition.', timestamp: '2025-05-23T10:15:00Z' },
    ],
  },
];

// ─── Board Helper Functions ───────────────────────────────────────────────────

export function getBoardSubmissions(): BoardSubmission[] {
  return boardSubmissions;
}

export function getBoardSubmissionById(id: string): BoardSubmission | undefined {
  return boardSubmissions.find(s => s.id === id);
}

export function getBoardVotesBySubmissionId(submissionId: string): BoardVote[] {
  return boardVotes.filter(v => v.submissionId === submissionId);
}

export function getPublishingSchedules(): PublishingSchedule[] {
  return publishingSchedules;
}

export function getReaderVoteInputs(): ReaderVoteInput[] {
  return readerVoteInputs;
}

export function getBoardRankings(): BoardRanking[] {
  return boardRankings;
}

export function getSeriesDecisions(): SeriesDecision[] {
  return seriesDecisions;
}

export function getSeriesDecisionById(id: string): SeriesDecision | undefined {
  return seriesDecisions.find(d => d.id === id);
}

export function getBoardStats() {
  const pending = boardSubmissions.filter(s => s.status === 'Pending Review').length;
  const approved = boardSubmissions.filter(s => s.status === 'Approved').length;
  const publishing = publishingSchedules.filter(s => s.status === 'Active').length;
  const atRisk = boardRankings.filter(r => r.status === 'At Risk').length;
  const cancelled = boardSubmissions.filter(s => s.status === 'Rejected').length;
  return { pending, approved, publishing, atRisk, cancelled };
}
