# FE ↔ BE Integration Plan

> **Lịch sử (2026-06-06).** Nhiều hạng mục mock đã wire xong (board reports, forgot-password, role guards, payroll thay VNPay FE, settings honesty…).  
> Nguồn mô tả luồng hiện tại: [`ROLE-WORKFLOWS.md`](./ROLE-WORKFLOWS.md). Không dùng bảng “mock 100%” bên dưới làm checklist triển khai mới.

Tài liệu đối chiếu trang FE chưa có API, API BE chưa có FE, và kế hoạch liên kết theo phase.

**Cập nhật gốc:** 2026-06-06 · **Banner:** 2026-07-19  
**Phạm vi (lúc viết):** 57 route FE · ~92 endpoint BE · 9 FE service modules

---

## Tổng quan

| Hạng mục | Số lượng | Ghi chú |
|----------|----------|---------|
| FE routes | 57 | ~38 đã gọi API · ~12 mock · ~7 hybrid/placeholder |
| BE endpoints | ~92 | ~55 có FE service · ~37 chưa wire |
| FE services | 9 | Thiếu `adminApi`, `activityLogsApi`, `annotationsApi` |

### FE services hiện có

| Service | Domain |
|---------|--------|
| `apiClient.ts` | Base URL, refresh token |
| `authApi.ts` | Register, Google OAuth, sync, me, logout |
| `seriesApi.ts` | Series, chapters, ranking, schedules |
| `tasksApi.ts` | My tasks, kanban aggregate |
| `workspaceApi.ts` | Pages, tasks CRUD, assistants |
| `submissionsApi.ts` | Submissions, review, earnings |
| `profilesApi.ts` | Assistants, invitations |
| `boardApi.ts` | Votes, pending series, leaderboard |
| `notificationsApi.ts` | List, mark read |

**Login email:** vẫn gọi `POST /api/auth/login` qua `mockData.loginUserWithApi`, chưa nằm trong `authApi.ts`.

---

## A. FE — Trang chưa có API (hoặc đang mock)

### A.1 Mock 100% — cần service + wire page

| Nhóm | Route / Trang | Nguồn mock | BE sẵn có? |
|------|---------------|------------|------------|
| **Admin** | `/admin/dashboard` | `adminMockData` | Profiles + Activity Logs |
| | `/admin/users` | `adminMockData` | `GET/PUT/DELETE /api/profiles` |
| | `/admin/users/create` | fake submit | `POST` register hoặc admin create |
| | `/admin/users/:userId` | `adminMockData` | `GET /api/profiles/{id}` |
| | `/admin/users/:userId/edit` | `adminMockData` | `PUT /api/profiles/{id}` |
| | `/admin/roles` | `adminMockData` | `PUT /api/profiles/{id}` (role) |
| | `/admin/activity` | `adminMockData` | `/api/activity-logs/*` |
| | `/admin/settings` | local only | Chưa có BE |
| **Board** | `/board/vote-input` | `mockData` | `POST/GET /api/board/votes` |
| | `/board/series-decisions` | `mockData` | pending-series + vote-progress |
| | `/board/series-decisions/:id` | `mockData` | Cùng board APIs |
| | `/board/reports` | `mockData` | leaderboard + votes + series |
| **Mangaka** | `/mangaka/submissions` | `mockData.submissions` | `GET /api/tasks/{id}/submissions` |

### A.2 Static / placeholder

| Route | Trạng thái |
|-------|------------|
| `/forgot-password` | Fake submit — **không có BE** |
| `/settings` | Toggle local — **không persist** |
| `/editor/series-defense` | Placeholder trống |
| `/`, `/404` | Static — OK |

### A.3 Hybrid — API một phần

| Trang | Đã có API | Còn mock |
|-------|-----------|----------|
| `/login` | Google OAuth | Email login qua `mockData.ts` |
| `/assistant/approved` | Task list | Payment dates mock |
| `/editor/dashboard` | Series/chapters | Stats/user mock |
| `/mangaka/series/:id` | Series + chapters | Tab submissions = `[]` |
| Layout Topbar | — | Notification badge mock |

### A.4 Đã tích hợp API (tham khảo nhanh)

| Role | Trang chính đã wire |
|------|---------------------|
| Mangaka | Dashboard, series, chapters, workspace, tasks, assistants, ranking |
| Assistant | Dashboard, tasks, submit, revisions, income, calendar, invitations |
| Editor | Assigned series, chapter reviews, ranking watch |
| Board | Dashboard, submissions, detail vote, approved series, schedule, rankings |
| Common | Profile, notifications, Google callback |

---

## B. BE — API chưa có FE

### B.1 Domain chưa có FE service (ưu tiên cao)

| Domain | Endpoints | Trang FE cần wire |
|--------|-----------|-------------------|
| **Activity Logs** | `GET /api/activity-logs` | `/admin/activity` |
| | `GET /api/activity-logs/me` | Profile / audit cá nhân |
| | `GET /api/activity-logs/stats` | Admin dashboard |
| | `GET /api/activity-logs/series/{seriesId}` | Series detail audit |
| | `GET /api/activity-logs/{id}` | Chi tiết log |
| | `POST /api/activity-logs` | Ghi log thủ công (staff) |
| **Annotations** | `GET/POST /api/pages/{pageId}/annotations` | Editor reviews, workspace |
| | `PUT/DELETE /api/annotations/{id}` | Sửa/xóa annotation |
| **Profiles (admin)** | `GET /api/profiles` | User management |
| | `GET /api/profiles/editors` | Filter editor |
| | `PUT /api/profiles/{id}` | Edit user |
| | `DELETE /api/profiles/{id}` | Deactivate user |
| **Rankings** | `POST /api/rankings` | Board nhập ranking (nếu cần) |

### B.2 Có BE, FE chưa dùng hết

| Endpoint | Gợi ý tích hợp FE |
|----------|-------------------|
| `GET /api/series/catalog` | Landing / catalog công khai |
| `GET /api/series/danger-zone` | Editor ranking watch, board dashboard |
| `PUT /api/series/{id}` | Edit metadata series (ngoài status) |
| `PUT /api/chapters/{id}` | Edit chapter metadata |
| `PUT /api/pages/{id}` | Workspace cập nhật page |
| `PUT /api/pages/{id}/status` | Workflow trạng thái page |
| `GET /api/pages/{id}/versions` | Lịch sử phiên bản page |
| `POST /api/auth/confirm-email` | Flow xác nhận email sau register |
| `POST /api/auth/resend-confirm-email` | Gửi lại email xác nhận |
| `GET /api/board/votes` | Board reports (service có, page mock) |

### B.3 Domain FE đã cover đủ

| Domain | Ghi chú |
|--------|---------|
| Tasks | Full |
| Submissions | Full |
| Board (core) | votes, pending, leaderboard |
| Schedules | Full |
| Notifications | Full |

### B.4 Auth trùng lặp (gom dần, không bắt buộc page mới)

| BE | FE đang dùng |
|----|--------------|
| `GET /api/auth/me` | ✓ `authApi.getMe` |
| `GET /api/profiles/me` | Không dùng |
| `PUT /api/auth/profile` | Không dùng |
| `PUT /api/profiles/update` | ✓ `authApi.updateMyProfile` |

---

## C. Ma trận ưu tiên

| Phase | Mục tiêu | Effort ước tính |
|-------|----------|-----------------|
| **1** | Admin + Activity Logs | 3–5 ngày |
| **2** | Editor Annotations + Page workflow | 2–3 ngày |
| **3** | Board mock + Mangaka submission history | 2–3 ngày |
| **4** | Auth polish + layout notifications | 1–2 ngày |

---

## D. Phase 1 — Admin + Activity Logs

**Mục tiêu:** Bỏ `adminMockData.ts` cho luồng quản trị chính.

| # | Task | FE | BE |
|---|------|----|----|
| 1.1 | Tạo `activityLogsApi.ts` | Service + types | `/api/activity-logs/*` |
| 1.2 | Tạo `adminApi.ts` | Profiles CRUD | `GET/PUT/DELETE /api/profiles` |
| 1.3 | Wire `SystemActivityPage` | List + filter logs | Activity Logs |
| 1.4 | Wire `UserManagementPage` | List users | `GET /api/profiles` |
| 1.5 | Wire `UserDetailPage` / `EditUserPage` | Get/update | `GET/PUT /api/profiles/{id}` |
| 1.6 | Wire `AdminDashboardPage` | Stats | `GET /api/activity-logs/stats` + profiles count |
| 1.7 | Wire `RoleManagementPage` | Update role | `PUT /api/profiles/{id}` |
| 1.8 | `CreateUserPage` | Register hoặc admin create | `POST /api/auth/register` + sync |

**Deliverable:** 8 trang admin dùng API thật (trừ settings nếu chưa có BE).

---

## E. Phase 2 — Editor + Workspace

**Mục tiêu:** Editor review và workspace dùng annotations + page workflow.

| # | Task | FE | BE |
|---|------|----|----|
| 2.1 | Tạo `annotationsApi.ts` | CRUD annotations | Annotations controller |
| 2.2 | Wire `ChapterReviewsPage` | Load/create annotations | Page annotations |
| 2.3 | Workspace annotate UI | Overlay comments | POST annotations |
| 2.4 | Page status workflow | Dropdown status | `PUT /pages/{id}/status` |
| 2.5 | Page metadata edit | Form edit | `PUT /pages/{id}` |
| 2.6 | Version history panel | List versions | `GET /pages/{id}/versions` |
| 2.7 | `SeriesDefensePage` | Wire hoặc ẩn route | TBD spec |

---

## F. Phase 3 — Board + Mangaka mock còn lại

**Mục tiêu:** Thay mock bằng API board/series/submissions có sẵn.

| # | Task | FE | BE |
|---|------|----|----|
| 3.1 | `SubmissionHistoryPage` | Aggregate submissions theo series/task | Submissions API |
| 3.2 | `VoteInputPage` | Form vote | `POST /api/board/votes` |
| 3.3 | `BoardReportsPage` | Charts từ leaderboard + votes | Board + Series |
| 3.4 | `SeriesDecisionPage` | Map pending + vote progress | Board APIs |
| 3.5 | Danger zone widget | Cảnh báo series | `GET /series/danger-zone` |

---

## G. Phase 4 — Polish & Auth

**Mục tiêu:** Gom auth, hoàn thiện UX phụ.

| # | Task | FE | BE |
|---|------|----|----|
| 4.1 | Gom login | `authApi.login()` thay `mockData` | `POST /api/auth/login` |
| 4.2 | Email confirm UI | Sau register | confirm-email endpoints |
| 4.3 | Topbar notifications | Badge từ API | `notificationsApi` |
| 4.4 | Series detail tab submissions | Load từ tasks/chapters | Submissions |
| 4.5 | Assistant approved payments | Từ earnings API | `GET /assistants/me/earnings` |
| 4.6 | Public catalog (optional) | Landing featured series | `GET /series/catalog` |

---

## H. Chưa có BE — quyết định sau

| Tính năng | Hướng xử lý |
|-----------|-------------|
| Forgot password | Supabase reset password hoặc endpoint BE mới |
| User/Admin settings persist | User preferences API hoặc mở rộng profile |
| Reader vote input (mock riêng) | Gom vào `POST /board/votes` nếu cùng nghiệp vụ |
| Series defense (editor) | Spec nghiệp vụ trước khi implement |

---

## I. Checklist triển khai (template)

```markdown
### Phase X — [Tên]
- [ ] Tạo service: `___Api.ts`
- [ ] Types/DTO mapping
- [ ] Wire page: `___Page.tsx`
- [ ] Xóa mock import
- [ ] Test happy path + 401/403
- [ ] Cập nhật README nếu cần
```

---

## J. Tham chiếu nhanh routes

<details>
<summary>57 routes (click mở)</summary>

| Path | Role | API? |
|------|------|------|
| `/` | common | redirect |
| `/login` | auth | hybrid |
| `/register` | auth | ✓ |
| `/forgot-password` | auth | ✗ |
| `/auth/google/callback` | auth | ✓ |
| `/profile` | common | ✓ |
| `/settings` | common | ✗ |
| `/notifications` | common | ✓ |
| `/mangaka/dashboard` | mangaka | ✓ |
| `/mangaka/series` | mangaka | ✓ |
| `/mangaka/series/create` | mangaka | ✓ |
| `/mangaka/series/:seriesId` | mangaka | hybrid |
| `/mangaka/series/:seriesId/chapters` | mangaka | ✓ |
| `/mangaka/series/:seriesId/chapters/create` | mangaka | ✓ |
| `/mangaka/series/:seriesId/ranking` | mangaka | ✓ |
| `/mangaka/chapters` | mangaka | ✓ |
| `/mangaka/chapters/:chapterId` | mangaka | ✓ |
| `/mangaka/pages/:pageId/workspace` | mangaka | ✓ |
| `/mangaka/tasks` | mangaka | ✓ |
| `/mangaka/tasks/:taskId/review` | mangaka | ✓ |
| `/mangaka/assistants` | mangaka | ✓ |
| `/mangaka/submissions` | mangaka | ✗ mock |
| `/mangaka/ranking` | mangaka | ✓ |
| `/assistant/*` (9 routes) | assistant | ✓ (1 hybrid) |
| `/editor/*` (6 routes) | editor | partial |
| `/admin/*` (8 routes) | admin | ✗ mock |
| `/board/*` (10 routes) | board | partial |

</details>

---

## K. Liên kết code

| Layer | Path |
|-------|------|
| FE routes | `FE/src/app/routes.tsx` |
| FE services | `FE/src/services/*.ts` |
| FE mock | `FE/src/data/mockData.ts`, `adminMockData.ts` |
| BE controllers | `BE/Controllers/*.cs` |
| Activity Logs | `BE/Controllers/ActivityLogsController.cs` |
| Annotations | `BE/Controllers/AnnotationsController.cs` |
