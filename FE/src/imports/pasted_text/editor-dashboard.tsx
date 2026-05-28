Tạo React + Tailwind UI cho web “Manga Creation Workflow and Publishing Management System”, chỉ làm role Tantou Editor. Chưa có backend nên dùng mock data + fake services.

Tech stack:
- ReactJS
- Tailwind CSS
- React Router
- Lucide React icons
- Mock data, không cần backend
- Login mock bằng localStorage

Theme: Manga Editorial Pro.
Design system: InkFlow.
Style: professional manga editorial dashboard, clean, có cảm giác giấy bản thảo, mực đen, dấu biên tập đỏ. Không quá anime, không neon.

Colors:
- Background #F7F3EA
- Card #FFFDF8
- Text #1F1F1F
- Muted #6B7280
- Border #D8D3C8
- Primary #D72638
- Secondary #4B3F72
- Accent #F2C94C
- Sidebar #1F1F1F
- Sidebar text #F7F3EA
- Active menu #D72638

Status colors:
- Draft #9CA3AF
- In Progress #4B3F72
- Submitted #2563EB
- Reviewing #F2C94C
- Revision Required #F97316
- Approved #16A34A
- At Risk #DC2626
- Published #7C3AED

Font: Be Vietnam Pro hoặc Inter.

Layout:
- Sidebar bên trái
- Topbar có page title, search, notification icon, avatar
- Content background #F7F3EA
- Card background #FFFDF8, border #D8D3C8, radius 16px, shadow nhẹ
- UI responsive desktop trước, mobile cơ bản

Basic pages:
1. Login Page - /login
2. Profile Page - /profile
3. Settings Page - /settings
4. Notifications Page - /notifications
5. 404 Not Found Page - *

Tantou Editor pages:

1. Editor Dashboard - /editor/dashboard
- Welcome card: “Welcome back, Editor”
- Summary cards:
  + Assigned Series
  + Chapters to Review
  + Upcoming Deadlines
  + Revision Requests
  + At Risk Series
- Section Studio Progress
- Section Pending Manuscript Reviews
- Section Ranking Warnings

2. Assigned Series Page - /editor/series
- Danh sách series editor đang phụ trách
- Search theo tên series
- Filter theo status
- Fields:
  + Cover
  + Series title
  + Mangaka
  + Genre
  + Status
  + Current ranking
  + Next deadline
  + Progress
  + Action View

3. Series Detail Page - /editor/series/:seriesId
- Header: cover, title, mangaka, genre, status, ranking
- Tabs:
  + Overview
  + Chapters
  + Progress
  + Ranking
  + Notes
- Overview: synopsis, target audience, author note
- Chapters: danh sách chapter cần theo dõi/review
- Progress: tiến độ pages/tasks
- Ranking: lịch sử ranking
- Notes: ghi chú của editor

4. Chapter Review List Page - /editor/reviews
- Danh sách chapter cần editor review
- Table fields:
  + Series
  + Chapter
  + Mangaka
  + Submitted date
  + Deadline
  + Review status
  + Action Review

5. Editor Review Page - /editor/chapters/:chapterId/review
IMPORTANT page.
Layout:
- Left: page thumbnails
- Center: manga page canvas, dark background #2B2B2B
- Right: annotation/comment panel

Features:
- Hiển thị manga page lớn
- Chọn vùng trên page bằng rectangle overlay
- Thêm annotation trực tiếp trên page
- Annotation form:
  + Annotation type
  + Comment
  + Priority
  + Suggested change
- Annotation types:
  + Story
  + Dialogue
  + Panel Layout
  + Character
  + Pacing
  + Art Correction
- Right panel hiển thị danh sách annotations
- Buttons:
  + Add Annotation
  + Request Revision
  + Approve Chapter
  + Save Review Draft

6. Studio Progress Page - /editor/progress
- Theo dõi tiến độ studio theo thời gian thực mock
- Cards:
  + Total pages
  + Completed pages
  + Pending tasks
  + Revision tasks
  + Days until deadline
- Progress bars theo từng chapter
- Table:
  + Series
  + Chapter
  + Pages completed
  + Tasks completed
  + Revision count
  + Deadline
  + Status

7. Deadline Management Page - /editor/deadlines
- Danh sách deadline của các series/chapter
- Filter: Overdue, This Week, This Month
- Fields:
  + Series
  + Chapter
  + Mangaka
  + Deadline
  + Progress
  + Risk level
  + Action View

8. Editor Notes Page - /editor/notes
- Ghi chú nội bộ của editor theo series/chapter
- List notes
- Create note form:
  + Series
  + Chapter
  + Title
  + Content
  + Priority
- Note types:
  + Story concern
  + Publishing concern
  + Ranking concern
  + Meeting note

9. Series Defense Page - /editor/series-defense
- Trang quản lý dữ liệu để editor bảo vệ series trước hội đồng
- Summary cards:
  + Current ranking
  + Average vote score
  + Sales/reader interest mock
  + Revision trend
- Sections:
  + Strength points
  + Risk points
  + Editor recommendation
  + Evidence table
- Button Prepare Board Report

10. Ranking Watch Page - /editor/ranking-watch
- Theo dõi ranking của các series phụ trách
- Table:
  + Rank
  + Previous rank
  + Series
  + Mangaka
  + Vote score
  + Trend
  + Risk status
  + Editor action
- Highlight series At Risk

Sidebar menu:
- Dashboard
- Assigned Series
- Chapter Reviews
- Studio Progress
- Deadlines
- Notes
- Series Defense
- Ranking Watch
- Notifications
- Profile
- Settings
- Logout

Components:
- Sidebar, Topbar, MainLayout
- Button, Card, Badge, Table, ProgressBar, UploadBox, SearchInput, FilterDropdown, EmptyState, Modal, Tabs
- SeriesCard, ChapterReviewCard, MangaPageCanvas, RegionOverlay, AnnotationPanel, AnnotationList, DeadlineCard, ProgressSummaryCard, RankingTrend, NoteCard

Mock data:
- users
- assignedSeries
- chapters
- mangaPages
- annotations
- editorReviews
- studioProgress
- deadlines
- editorNotes
- rankings
- notifications

Requirements:
- Use mock data and fake services
- Code component rõ ràng
- Không hardcode quá nhiều trong page
- Button có hover state
- Page có empty state
- Badge trạng thái rõ ràng
- Editor Review Page là điểm nhấn chính của Tantou Editor
- Không cần upload thật, chỉ UI mock
- Không cần backend
- Không cần AI feature
- UI phải đẹp, đồng bộ, chuyên nghiệp, phù hợp demo