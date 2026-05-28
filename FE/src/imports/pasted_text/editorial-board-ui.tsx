Tạo React + Tailwind UI cho web “Manga Creation Workflow and Publishing Management System”, chỉ làm role Editorial Board. Chưa có backend nên dùng mock data + fake services.

Tech stack:
- ReactJS
- Tailwind CSS
- React Router
- Lucide React icons
- Mock data, không cần backend
- Login mock bằng localStorage

Theme: Manga Editorial Pro.
Design system: InkFlow.
Style: professional manga publishing dashboard, clean, editorial, có cảm giác hội đồng xuất bản manga. Không quá anime, không neon.

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
- Pending Review #2563EB
- Approved #16A34A
- Rejected #DC2626
- Publishing #7C3AED
- At Risk #DC2626
- Cancelled #374151
- Monthly #4B3F72
- Weekly #D72638

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

Editorial Board pages:

1. Board Dashboard - /board/dashboard
- Welcome card: “Welcome back, Editorial Board”
- Summary cards:
  + Pending Submissions
  + Approved Series
  + Publishing Series
  + At Risk Series
  + Cancelled Series
- Section Pending Series Approval
- Section Ranking Alerts
- Section Recent Reader Vote Results

2. Pending Series Approval Page - /board/submissions
- Danh sách series chờ hội đồng duyệt
- Search theo tên series hoặc Mangaka
- Filter theo status
- Fields:
  + Series title
  + Mangaka
  + Genre
  + Submitted date
  + Status
  + Vote result
  + Action View Detail

3. Series Approval Detail Page - /board/submissions/:submissionId
IMPORTANT page.
- Header: cover, series title, mangaka, genre, submitted date, status
- Sections:
  + Synopsis
  + Target audience
  + Main characters
  + Draft manuscript preview
  + Editor recommendation
  + Board vote summary
- Voting panel:
  + Approve button
  + Reject button
  + Request More Information button
  + Textarea reason/comment
- Hiển thị danh sách vote/comment của các board members bằng mock data

4. Approved Series Page - /board/approved-series
- Danh sách series đã được thông qua
- Fields:
  + Series
  + Mangaka
  + Genre
  + Approved date
  + Publishing type
  + Current status
  + Action Manage

5. Publishing Schedule Page - /board/publishing-schedule
- Quản lý lịch xuất bản
- Table:
  + Series
  + Mangaka
  + Publishing type
  + Release day
  + Start date
  + Next release date
  + Status
- Form tạo/sửa lịch:
  + Series
  + Publishing type: Weekly / Monthly
  + Start date
  + Release day
  + Note
- Buttons: Create Schedule, Update Schedule

6. Reader Vote Input Page - /board/vote-input
- Nhập dữ liệu bình chọn độc giả sau mỗi kỳ phát hành
- Form:
  + Issue number
  + Series
  + Release date
  + Vote count
  + Reader score
  + Comment
- Table recent vote inputs:
  + Issue
  + Series
  + Vote count
  + Score
  + Input date

7. Ranking Page - /board/rankings
- Bảng xếp hạng series
- Summary cards:
  + Top Series
  + Biggest Rise
  + Biggest Drop
  + At Risk Count
- Table:
  + Rank
  + Previous rank
  + Series
  + Mangaka
  + Vote score
  + Trend
  + Status
  + Action View
- Highlight series At Risk
- Có filter Weekly / Monthly / All

8. Series Decision Page - /board/series-decisions
- Trang ra quyết định với series ranking thấp
- Danh sách series At Risk
- Fields:
  + Series
  + Mangaka
  + Current rank
  + Bottom ranking count
  + Latest vote score
  + Risk reason
  + Action Decide
- Decision actions:
  + Continue
  + Cancel
  + Change to Monthly
  + Put on Hiatus

9. Series Decision Detail Page - /board/series-decisions/:seriesId
- Header: series info, current rank, risk status
- Sections:
  + Ranking history
  + Vote history
  + Editor defense note
  + Board discussion mock
- Decision form:
  + Decision type
  + Reason
  + Effective date
  + Button Submit Decision

10. Publishing Reports Page - /board/reports
- Dashboard báo cáo tổng quan
- Cards:
  + Total submissions
  + Approval rate
  + Average vote score
  + Cancelled series count
- Charts giả hoặc table:
  + Ranking trend
  + Vote performance
  + Publishing status distribution

Sidebar menu:
- Dashboard
- Pending Submissions
- Approved Series
- Publishing Schedule
- Vote Input
- Rankings
- Series Decisions
- Reports
- Notifications
- Profile
- Settings
- Logout

Components:
- Sidebar, Topbar, MainLayout
- Button, Card, Badge, Table, ProgressBar, SearchInput, FilterDropdown, EmptyState, Modal, Tabs
- SubmissionCard, VotePanel, BoardVoteSummary, RankingTable, RankingTrend, PublishingScheduleForm, VoteInputForm, DecisionPanel, ReportCard

Mock data:
- users
- submissions
- boardVotes
- approvedSeries
- publishingSchedules
- readerVotes
- rankings
- seriesDecisions
- reports
- notifications

Requirements:
- Use mock data and fake services
- Code component rõ ràng
- Không hardcode quá nhiều trong page
- Button có hover state
- Page có empty state
- Badge trạng thái rõ ràng
- Series Approval Detail Page và Ranking Page là điểm nhấn chính
- Không cần backend
- Không cần upload thật, chỉ UI mock
- Không cần AI feature
- UI phải đẹp, đồng bộ, chuyên nghiệp, phù hợp demo