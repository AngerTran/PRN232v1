# Luồng chính theo từng role — MangaFlow

Tài liệu mô tả các luồng nghiệp vụ chính của web **MangaFlow / InkFlow** theo từng role.

> **Sơ đồ chi tiết (Mermaid):** xem [ROLE-WORKFLOWS-DIAGRAMS.md](./ROLE-WORKFLOWS-DIAGRAMS.md)

Hệ thống có **5 role**: `mangaka`, `assistant`, `editor`, `board`, `admin`. Mỗi role có dashboard và menu riêng; tất cả đều dùng chung **Thông báo**, **Hồ sơ**, **Cài đặt**.

---

## Tổng quan: Series đi qua các role

```mermaid
flowchart LR
    subgraph Mangaka
        A[Tạo series draft]
        B[Nộp duyệt]
        C[Sản xuất chapter/page]
        D[Giao task; Admin payroll]
    end
    subgraph Board
        E[3 board được gán vote]
        F[Nhập ranking theo kỳ XB]
        G[Lead lên lịch xuất bản]
        H[Quyết định danger zone]
    end
    subgraph Editor
        I[Nhận lời mời]
        J[Review chapter/page]
        K[Đánh dấu hoàn thành]
    end
    subgraph Assistant
        L[Nhận lời mời studio]
        M[Làm task + nộp bài]
    end

    A --> B --> E
    E -->|≥3 vote approve| C
    C --> D --> M
    M --> D
    I --> J
    J --> K
    K --> G
    C --> F
    F --> H
```

### Vòng đời trạng thái series

| Trạng thái | Ý nghĩa |
|------------|---------|
| `draft` | Mangaka đang soạn, upload bản thảo đề xuất (chapter 0) |
| `pending_review` | Đã gửi lên board, chờ vote |
| `approved` | Board duyệt — được sản xuất chapter thật |
| `publishing` | Đang xuất bản |
| `completed` | Editor đánh dấu hoàn thành — board lên lịch xuất bản |
| `hiatus` | Tạm dừng |
| `cancelled` | Bị từ chối / hủy |

**Quy tắc quan trọng** (từ `SeriesWorkflowRules`):

- Mangaka chỉ **sản xuất chapter** (số > 0) khi series đã `approved`, `publishing` hoặc `hiatus`.
- **Bản thảo đề xuất** (chapter 0) chỉ upload khi series còn `draft`.
- Board **Lead của series** mới **lên lịch xuất bản** (admin bypass được).
- Ngày XB tương lai: chapter giữ/chuyển `completed`; tới ngày mới `published`.
---

## 1. Mangaka (Tác giả)

**Vai trò:** Sáng tác, quản lý series, điều phối assistant/editor, nộp duyệt, review task, thanh toán.

### Menu sidebar

| Nhóm | Mục |
|------|-----|
| Sáng tác | Tổng quan, Series của tôi, Tạo Series, Chương |
| Quản lý | Nhiệm vụ, Trợ lý, Editor, Nộp series, Xếp hạng |

### Các luồng hoạt động

| Luồng | Hoạt động | Trang FE | API BE |
|-------|-----------|----------|--------|
| Onboarding series | Tạo series, upload cover, thêm chapter 0 (bản thảo) | `/mangaka/series/create` | `POST /api/series` |
| Nộp duyệt | Gửi lên board (`draft` → `pending_review`) | `/mangaka/submissions` | `PUT /api/series/{id}/status` |
| Sản xuất | Tạo chapter → page → workspace (sau khi approved) | `/mangaka/chapters`, `/mangaka/pages/{id}/workspace` | `POST /api/series/{id}/chapters`, `POST /api/pages` |
| Quản lý team | Mời assistant / editor | `/mangaka/assistants`, `/mangaka/editors` | `POST /api/profiles/assistants/invite`, `POST /api/series/{id}/editor-invitations` |
| Giao việc | Tạo task trên page, gán assistant, đặt giá | `/mangaka/tasks` | `POST /api/tasks` |
| Review bài nộp | Duyệt / từ chối submission | `/mangaka/tasks/{id}/review` | `PATCH /api/submissions/{id}` |
| Thanh toán | Theo dõi thu nhập assistant (chi trả do Admin payroll) | Workspace / TaskList | earnings / payroll |
| Theo dõi | Xếp hạng, lịch sử nộp | `/mangaka/ranking`, `/mangaka/submissions` | `GET /api/series/ranking` |

### Luồng duyệt series (mangaka)

```
Tạo series (draft)
  → Upload chapter 0 + bản thảo
  → Nộp duyệt (pending_review)
  → Hệ thống gán cố định 3 board (1 Lead ít việc + 2 board thường)
  → Chỉ 3 board đó vote (≥3 phiếu → quyết định)
  → approved → Bắt đầu sản xuất chapter
```

---

## 2. Assistant (Trợ lý)

**Vai trò:** Nhận task từ mangaka, làm art hỗ trợ (background, cleanup, shading…), nộp bài, theo dõi thu nhập.

### Menu sidebar

| Nhóm | Mục |
|------|-----|
| Công việc | Dashboard, Công việc của tôi, Lời mời studio, Cần chỉnh sửa, Đã duyệt |
| Kế hoạch | Thu nhập, Lịch làm việc |

### Các luồng hoạt động

| Luồng | Hoạt động | Trang FE | API BE |
|-------|-----------|----------|--------|
| Tham gia studio | Nhận / chấp nhận lời mời từ mangaka | `/assistant/invitations` | `PATCH /api/profiles/assistants/{id}/respond` |
| Nhận task | Xem task được giao, bắt đầu làm | `/assistant/tasks` | `PATCH /api/tasks/{id}/status` |
| Nộp bài | Upload kết quả | `/assistant/tasks/{id}/submit` | `POST /api/submissions` |
| Chỉnh sửa | Task bị reject → làm lại | `/assistant/revisions` | — |
| Hoàn thành | Task approved, chờ thanh toán | `/assistant/approved` | — |
| Thu nhập | Xem earnings | `/assistant/income` | `GET /api/submissions/earnings` |
| Lịch | Deadline task | `/assistant/calendar` | `GET /api/tasks` |

**Lưu ý:** Assistant **không** tự tạo thanh toán. Chi trả theo **Admin payroll** (ngày 5 hàng tháng), không còn VNPay trên FE.

---

## 3. Editor (Biên tập)

**Vai trò:** Phụ trách series được mời, review chapter/page, ghi annotation, đẩy tiến độ xuất bản.

### Menu sidebar

| Nhóm | Mục |
|------|-----|
| Biên tập | Dashboard, Series phụ trách, Lời mời phụ trách, Chapter Reviews |
| Theo dõi | Ranking Watch, Series Defense |

### Các luồng hoạt động

| Luồng | Hoạt động | Trang FE | API BE |
|-------|-----------|----------|--------|
| Nhận series | Chấp nhận lời mời từ mangaka | `/editor/invitations` | `PATCH /api/series/editor-invitations/{seriesId}/accept` |
| Series phụ trách | Xem / sửa metadata series | `/editor/series` | `GET/PUT /api/series/{id}` |
| Review chapter | Duyệt chapter `reviewing` | `/editor/reviews` | `PUT /api/chapters/{id}/status` |
| Annotation | Ghi chú trên page | Chapter review UI | `POST /api/annotations` |
| Hoàn thành series | `completed` → board lên lịch xuất bản | Series detail | `PUT /api/series/{id}/status` |
| Theo dõi ranking | Series publishing rank thấp | `/editor/ranking-watch`, `/editor/series-defense` | `GET /api/series/danger-zone` |

---

## 4. Board (Hội đồng xuất bản)

**Vai trò:** Duyệt series mới, nhập dữ liệu độc giả, lên lịch xuất bản, quyết định series “danger zone”.

### Menu sidebar

| Nhóm | Mục |
|------|-----|
| Quản lý | Dashboard, Duyệt Series, Series Đã Duyệt, Lịch Xuất Bản |
| Phân tích | Nhập Vote, Bảng Xếp Hạng, Quyết Định Series, Báo Cáo |

### Các luồng hoạt động

| Luồng | Hoạt động | Trang FE | API BE |
|-------|-----------|----------|--------|
| Duyệt series mới | Vote approve/reject (chỉ 3 board được gán) | `/board/submissions`, `/board/submissions/{id}` | `POST /api/board/votes` |
| Quorum | **≥ 3 phiếu** từ nhóm được gán → tự quyết định | — | `BoardService.TryAutoUpdateSeriesStatusAsync` |
| Series đã duyệt / đã nhận | Xem approved / publishing | `/board/approved-series` | `GET /api/series` |
| Nhập vote độc giả | Vote + popularity theo **kỳ XB** (từ ngày publish) | `/board/vote-input` | `GET/POST /api/rankings…` |
| Bảng xếp hạng | Sort vote → popularity; hạng cạnh tranh (tie = cùng hạng) | `/board/rankings` | `GET /api/board/leaderboard` |
| Lịch xuất bản | Lead series lên lịch; ngày tương lai → chapter `completed`, tới ngày → `published` | `/board/publishing-schedule` | `POST /api/publishing-schedules` |
| Danger zone | Rank thấp → continue / monthly / hiatus / cancel | `/board/series-decisions` | `POST /api/board/danger-series/{id}/decision` |
| Báo cáo | Pending / approved / cancelled từ series APIs | `/board/reports` | pending + visible + approved series |

### Luồng vote duyệt series

```
Mangaka gửi pending_review
  → Auto-gán 3 board: 1 Board Lead (ít việc nhất) + 2 board thường (ít việc nhất)
  → Chỉ 3 người đó: POST /api/board/votes { decision: approve|reject }
  → Khi ≥ 3 phiếu:
       approve > reject  →  approved (Series Đã Duyệt)
       reject ≥ approve  →  cancelled (Từ chối)
  → Board Lead của series phụ trách lên lịch xuất bản sau khi sản xuất xong
```

### Kỳ xếp hạng (issue)

- **Issue/kỳ** encode từ **ngày xuất bản** + tần suất (weekly ISO / monthly), không phải số chapter.
- Nhập vote: không nhập hạng thủ công — hệ thống xếp theo vote rồi popularity.

---

## 5. Admin (Quản trị)

**Vai trò:** Quản lý user/role, xem activity log, cấu hình. Có quyền **bypass** nhiều luồng (đổi status series, xem toàn bộ data).

### Menu sidebar

| Nhóm | Mục |
|------|-----|
| Quản trị | Dashboard, Người dùng, Vai trò |
| Hệ thống | Hoạt động, Cài đặt Admin |

### Các luồng hoạt động

| Luồng | Hoạt động | Trang FE | API BE |
|-------|-----------|----------|--------|
| Dashboard | Thống kê user, series, role | `/admin/dashboard` | `GET /api/profiles`, activity stats |
| Quản lý user | CRUD, kích hoạt/vô hiệu | `/admin/users` | `GET/PUT/DELETE /api/profiles` |
| Vai trò | Phân role | `/admin/roles` | `PUT /api/profiles/{id}` |
| Activity log | Audit hành động | `/admin/activity` | `GET /api/activity-logs` |
| Cài đặt | Gán / gỡ **Board Lead** (chính sách khác chưa có API) | `/admin/settings` | Board Lead APIs |
| Payroll | Chi trả assistant theo tháng (ngày 5) | `/admin/payroll` | `GET/POST /api/payroll…` |

---

## Luồng task (Mangaka ↔ Assistant)

```mermaid
stateDiagram-v2
    [*] --> todo: Mangaka giao task
    todo --> in_progress: Assistant nhận việc
    in_progress --> submitted: Assistant nộp bài
    submitted --> approved: Mangaka duyệt
    submitted --> rejected: Mangaka từ chối
    rejected --> in_progress: Assistant sửa lại
    approved --> paid: Admin đánh dấu payroll đã trả
```

| Trạng thái task | Ai thao tác |
|-----------------|-------------|
| `todo` | Mangaka/editor tạo task |
| `in_progress` | Assistant bắt đầu làm |
| `submitted` | Assistant nộp bài |
| `approved` / `rejected` | Mangaka review submission |
| `paid` | Admin đánh dấu đã chi trong payroll tháng |

**Loại task:** `background`, `shading`, `cleanup`, `speech_bubble`, `effects`, `lineart`, `other`

---

## Luồng thanh toán (Admin payroll)

```
Task approved (có giá)
  → Cộng vào bảng lương assistant theo tháng
  → Admin mở /admin/payroll (ngày chi: ngày 5)
  → Đánh dấu đã trả → task.payment_status = paid
```

**Lưu ý:** Endpoint VNPay cũ có thể còn trên BE nhưng FE không còn luồng thanh toán từng task; `/payment-return` chỉ trang giải thích.

---

## Luồng chung (mọi role)

| Tính năng | Route FE | API BE |
|-----------|----------|--------|
| Đăng nhập | `/login` | `POST /api/auth/login` |
| Đăng ký | `/register` | `POST /api/auth/register` |
| Quên mật khẩu | `/forgot-password` | `POST /api/auth/forgot-password` |
| Google OAuth | `/auth/google/callback` | `GET /api/auth/google/url` |
| Thông báo | `/notifications` | `GET /api/notifications` |
| Hồ sơ | `/profile` | `GET/PUT /api/profiles/me` |
| Cài đặt | `/settings` | Preview UI — chưa sync server |
| Payment return | `/payment-return` | Trang giải thích (legacy VNPay) |

---

## Tóm tắt: Ai làm gì?

| Role | Trọng tâm |
|------|-----------|
| **Mangaka** | Tạo truyện → nộp duyệt → sản xuất → giao task → review |
| **Assistant** | Nhận việc → làm → nộp → sửa nếu reject → nhận lương (payroll) |
| **Editor** | Nhận series → review chapter → annotation → hoàn thành series |
| **Board** | 3 board được gán vote duyệt → nhập ranking theo kỳ → Lead lên lịch XB → at-risk |
| **Admin** | User, role, Board Lead, payroll, audit log |

---

## Tài khoản demo (seed script)

Mật khẩu chung: `123456`

| Role | Email |
|------|-------|
| Admin | `admin@inkflow.jp` |
| Mangaka | `hiroshi.tanaka@inkflow.jp` |
| Assistant | `keiko.y@inkstudio.jp` |
| Editor | `akira.k@inkflow-editorial.jp` |
| Board | `yuki.n@inkflow-board.jp` |

Chạy seed: `scripts/supabase-seed-sample-data.sql` trong Supabase SQL Editor.

---

*Cập nhật 2026-07-19: auto-gán 3 board (Lead + 2), kỳ ranking từ ngày XB, lịch publish gating, payroll Admin, quên mật khẩu API.*
