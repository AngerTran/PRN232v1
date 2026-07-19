# Sơ đồ luồng hoạt động chi tiết — MangaFlow

Tài liệu bổ sung cho [ROLE-WORKFLOWS.md](./ROLE-WORKFLOWS.md), mô tả **từng bước** bằng sơ đồ Mermaid.

> Mở file này trong VS Code / GitHub / Cursor để xem diagram render.  
> Công cụ hỗ trợ: [Mermaid Live Editor](https://mermaid.live)

---

## Mục lục

1. [Vòng đời Series (state machine)](#1-vòng-đời-series-state-machine)
2. [Luồng tổng thể đa role (sequence)](#2-luồng-tổng-thể-đa-role-sequence)
3. [Mangaka](#3-mangaka)
4. [Assistant](#4-assistant)
5. [Editor](#5-editor)
6. [Board](#6-board)
7. [Admin](#7-admin)
8. [Luồng Task + Submission](#8-luồng-task--submission)
9. [Luồng thanh toán (Admin payroll)](#9-luồng-thanh-toán-admin-payroll)
10. [Luồng mời Assistant / Editor](#10-luồng-mời-assistant--editor)
11. [Luồng Auth & chung](#11-luồng-auth--chung)
12. [Sơ đồ phụ thuộc quyền (ai làm được gì)](#12-sơ-đồ-phụ-thuộc-quyền-ai-làm-được-gì)

---

## 1. Vòng đời Series (state machine)

```mermaid
stateDiagram-v2
    [*] --> draft: Mangaka tạo series

    draft --> pending_review: Mangaka nộp duyệt\nPUT /api/series/{id}/status
    draft --> draft: Sửa metadata, upload ch.0

    pending_review --> approved: Board ≥3 vote\napprove > reject
    pending_review --> cancelled: Board ≥3 vote\nreject ≥ approve
    pending_review --> pending_review: Chưa đủ 3 vote

    approved --> publishing: Editor/Mangaka/Admin\nbắt đầu xuất bản
    approved --> hiatus: Tạm dừng
    approved --> cancelled: Admin hủy

    publishing --> completed: Editor đánh dấu hoàn thành
    publishing --> hiatus: Tạm dừng
    publishing --> cancelled: Board danger / Admin

    hiatus --> publishing: Tiếp tục
    completed --> [*]: Kết thúc arc

    cancelled --> [*]
```

### Ràng buộc theo trạng thái

```mermaid
flowchart TB
    subgraph draft["draft"]
        D1[Tạo chapter 0 - bản thảo đề xuất]
        D2[Upload cover, mô tả]
    end

    subgraph pending["pending_review"]
        P1[Chờ board vote]
        P2[Không sản xuất chapter mới]
    end

    subgraph approved_pub["approved / publishing / hiatus"]
        A1[Tạo chapter 1, 2, 3...]
        A2[Tạo page, giao task assistant]
        A3[Editor review]
    end

    subgraph completed["completed"]
        C1[Board lên lịch xuất bản]
    end

    draft --> pending
    pending --> approved_pub
    approved_pub --> completed
```

---

## 2. Luồng tổng thể đa role (sequence)

```mermaid
sequenceDiagram
    autonumber
    actor M as Mangaka
    actor B as Board (×3)
    actor A as Assistant
    actor E as Editor
    participant FE as Frontend
    participant BE as Backend API
    participant DB as Database

    Note over M,DB: Giai đoạn 1 — Đề xuất series
    M->>FE: Tạo series + chapter 0
    FE->>BE: POST /api/series
    BE->>DB: series.status = draft
    M->>FE: Nộp duyệt
    FE->>BE: PUT status = pending_review
    BE->>DB: Cập nhật status

    Note over M,DB: Giai đoạn 2 — Board vote
  loop Mỗi thành viên board
        B->>FE: Vote approve/reject
        FE->>BE: POST /api/board/votes
        BE->>DB: Lưu board_votes
    end
    BE->>BE: Đủ 3 vote → so sánh approve vs reject
    BE->>DB: status = approved hoặc cancelled

    Note over M,DB: Giai đoạn 3 — Sản xuất
    M->>FE: Tạo chapter, page
    FE->>BE: POST chapters, pages
    M->>FE: Mời editor
    E->>FE: Accept invitation
    M->>FE: Giao task cho assistant
    FE->>BE: POST /api/tasks
    A->>FE: Nhận việc, nộp bài
    FE->>BE: POST /api/submissions
    M->>FE: Duyệt submission
    FE->>BE: PATCH submission approve
    M->>FE: Thanh toán VNPay
    FE->>BE: POST /api/tasks/{id}/payment

    Note over M,DB: Giai đoạn 4 — Biên tập & xuất bản
    E->>FE: Review chapter, annotation
    E->>FE: Đánh dấu series completed
    B->>FE: Nhập ranking độc giả
    FE->>BE: POST /api/rankings
    B->>FE: Lên lịch xuất bản
    FE->>BE: POST /api/publishing-schedules
```

---

## 3. Mangaka

### 3.1 Onboarding & nộp duyệt series

```mermaid
flowchart TD
    START([Đăng nhập mangaka]) --> DASH[/mangaka/dashboard/]
    DASH --> CREATE[/mangaka/series/create/]
    CREATE --> API1[POST /api/series]
    API1 --> DRAFT[(status: draft)]

    DRAFT --> CH0[Tạo chapter 0\nbản thảo đề xuất]
    CH0 --> COVER[Upload cover\nPOST /api/series/{id}/cover]
    COVER --> INVITE{A muốn mời\neditor sớm?}
    INVITE -->|Sau approved| SUBMIT
    INVITE -->|Không| SUBMIT

    SUBMIT[/mangaka/submissions/\nNộp duyệt] --> API2[PUT /api/series/{id}/status\npending_review]
    API2 --> WAIT[Chờ board ≥3 vote]
    WAIT -->|approved| PROD[Bắt đầu sản xuất]
    WAIT -->|cancelled| REJECT[Series bị từ chối]
```

### 3.2 Sản xuất chapter & page

```mermaid
flowchart TD
    PROD([Series approved+]) --> CHLIST[/mangaka/chapters/]
    CHLIST --> NEWCH[Tạo chapter mới\nPOST /api/series/{id}/chapters]
    NEWCH --> CHDET[/mangaka/chapters/{id}/]
    CHDET --> NEWPAGE[Tạo page\nPOST /api/pages]
    NEWPAGE --> WS[/mangaka/pages/{id}/workspace/]

    WS --> TASK{Tạo task\ncho assistant?}
    TASK -->|Có| CREATETASK[POST /api/tasks\ngán assistant + giá]
    TASK -->|Không| EDIT[Tự chỉnh page]
    CREATETASK --> KANBAN[Kanban task theo chapter\nGET /api/chapters/{id}/kanban]
    EDIT --> PUBPAGE[Cập nhật page status]
```

### 3.3 Quản lý team (Assistant & Editor)

```mermaid
flowchart LR
    subgraph Assistants
        MA[/mangaka/assistants/]
        MA --> INV_A[POST invite assistant]
        INV_A --> PEND_A[status: pending]
        PEND_A --> ACC_A[Assistant accept]
        ACC_A --> OK_A[status: accepted\nCó thể giao task]
    end

    subgraph Editors
        ME[/mangaka/editors/]
        ME --> INV_E[POST editor-invitations\nseries phải approved]
        INV_E --> PEND_E[Editor nhận lời mời]
        PEND_E --> ACC_E[PATCH accept]
        ACC_E --> OK_E[editor_id gán vào series]
    end
```

### 3.4 Review task & thanh toán

```mermaid
flowchart TD
    NOTIFY[Thông báo: assistant nộp bài] --> REVIEW[/mangaka/tasks/{id}/review/]
    REVIEW --> DECIDE{Duyệt?}
    DECIDE -->|Approve| APP[task.status = approved]
    DECIDE -->|Reject| REJ[task.status = rejected\nAssistant sửa lại]
    APP --> PAY{Thanh toán?}
    PAY -->|Có| VNPAY[POST /api/tasks/{id}/payment]
    VNPAY --> PAID[payment_status = paid]
    REJ --> REV2[Assistant nộp version mới]
    REV2 --> REVIEW
```

---

## 4. Assistant

### 4.1 Luồng tổng Assistant

```mermaid
flowchart TD
    LOGIN([Đăng nhập assistant]) --> DASH[/assistant/dashboard/]
    DASH --> INV_CHECK{Có lời mời\nstudio?}
    INV_CHECK -->|Có| INV[/assistant/invitations/]
    INV --> RESPOND[Accept / Reject\nmangaka_assistants]
    INV_CHECK -->|Không| TASKS
    RESPOND --> TASKS[/assistant/tasks/]

    TASKS --> PICK[Chọn task được giao]
    PICK --> START[PATCH status in_progress]
    START --> WORK[Làm việc trên page region]
    WORK --> SUBMIT[/assistant/tasks/{id}/submit/]
    SUBMIT --> API[POST /api/submissions]

    API --> WAIT[Chờ mangaka review]
    WAIT -->|approved| APPROVED[/assistant/approved/]
    WAIT -->|rejected| REV[/assistant/revisions/]
    REV --> WORK

    APPROVED --> INCOME[/assistant/income/\nGET earnings]
    TASKS --> CAL[/assistant/calendar/\nDeadline]
```

### 4.2 Trạng thái task từ góc nhìn Assistant

```mermaid
stateDiagram-v2
    [*] --> todo: Mangaka giao task
    todo --> in_progress: Assistant bắt đầu
    in_progress --> submitted: Nộp bài POST /submissions
    submitted --> approved: Mangaka duyệt
    submitted --> rejected: Mangaka từ chối
    rejected --> in_progress: Sửa & nộp lại
    approved --> [*]: Chờ mangaka thanh toán
    note right of approved: Assistant không initiate VNPay
```

---

## 5. Editor

### 5.1 Luồng tổng Editor

```mermaid
flowchart TD
    LOGIN([Đăng nhập editor]) --> DASH[/editor/dashboard/]
    DASH --> INV[/editor/invitations/]
    INV --> ACC{Chấp nhận\nseries?}
    ACC -->|Có| SERIES[/editor/series/]
    ACC -->|Không| DASH

    SERIES --> META[Sửa metadata series\nPUT /api/series/{id}]
    SERIES --> REVLIST[/editor/reviews/]
    REVLIST --> CHREV[/editor/chapters/{id}/review/]
    CHREV --> ANNO[POST /api/annotations\ncorrection, dialogue, warning]
    ANNO --> CHSTATUS[PUT chapter status]

    SERIES --> COMPLETE[Đánh dấu series completed\nPUT status = completed]
    COMPLETE --> BOARD_SCHEDULE[Board có thể lên lịch xuất bản]

    DASH --> RANK[/editor/ranking-watch/]
    RANK --> DANGER[/editor/series-defense/\nGET danger-zone series]
```

### 5.2 Review chapter chi tiết

```mermaid
sequenceDiagram
    actor E as Editor
    participant FE as Frontend
    participant BE as API
    participant DB as DB

    E->>FE: Mở chapter reviewing
    FE->>BE: GET /api/chapters/{id}
    FE->>BE: GET /api/pages?chapterId=
    loop Từng page
        E->>FE: Thêm annotation
        FE->>BE: POST /api/annotations
        BE->>DB: Lưu annotation
    end
    E->>FE: Đổi chapter status
    FE->>BE: PUT /api/chapters/{id}/status
    BE->>DB: draft → in_progress → reviewing → published
```

---

## 6. Board

### 6.1 Vote duyệt series (chi tiết)

```mermaid
flowchart TD
    START([Series pending_review]) --> LIST[/board/submissions/]
    LIST --> DETAIL[/board/submissions/{id}/]
    DETAIL --> VOTE[POST /api/board/votes\napprove | reject + comment]

    VOTE --> COUNT{Đếm vote\ntừ board member}
    COUNT -->|< 3 vote| WAIT[Vẫn pending_review\nHiển thị x/y phiếu]
    WAIT --> VOTE

    COUNT -->|≥ 3 vote| COMPARE{approve > reject?}
    COMPARE -->|Có| APPROVED[(status: approved)]
    COMPARE -->|Không| CANCEL[(status: cancelled)]

    APPROVED --> APP_LIST[/board/approved-series/]
    CANCEL --> REJ_LIST[Dashboard / submissions]
```

### 6.2 Quorum logic

```mermaid
flowchart LR
    V1[Vote 1] --> C{≥3 distinct\nboard votes?}
    V2[Vote 2] --> C
    V3[Vote 3] --> C
    VN[Vote N...] --> C
    C -->|Chưa| PENDING[pending_review]
    C -->|Rồi| CMP{approve > reject?}
    CMP -->|Yes| A[approved]
    CMP -->|No| R[cancelled]
```

### 6.3 Ranking & lịch xuất bản

```mermaid
flowchart TD
    subgraph Ranking độc giả
        VI[/board/vote-input/] --> CR[POST /api/rankings\nissue, rank, votes, score]
        CR --> BR[/board/rankings/]
        BR --> LB[GET /api/board/leaderboard]
    end

    subgraph Lịch xuất bản
        AS[/board/approved-series/] --> PS[/board/publishing-schedule/]
        PS --> CHK{Series = completed?}
        CHK -->|Có| SCH[POST /api/publishing-schedules]
        CHK -->|Không| ERR[Không cho lên lịch]
    end
```

### 6.4 Danger zone decision

```mermaid
flowchart TD
    PUB[(Series publishing)] --> RANK[Ranking thấp\nrank ≥ 30]
    RANK --> DZ[GET /api/series/danger-zone]
    DZ --> SD[/board/series-decisions/]
    SD --> DET[/board/series-decisions/{id}/]
    DET --> DEC{Quyết định}

    DEC -->|continue| CONT[Giữ publishing]
    DEC -->|monthly| MON[Đổi frequency monthly]
    DEC -->|hiatus| HI[status = hiatus]
    DEC -->|cancel| CAN[status = cancelled]

    CONT --> API[POST /api/board/danger-series/{id}/decision]
    MON --> API
    HI --> API
    CAN --> API
```

### 6.5 Báo cáo

```mermaid
flowchart LR
    REP[/board/reports/] --> V[GET /api/board/votes]
    REP --> L[GET /api/board/leaderboard]
    REP --> S[GET /api/series]
    V & L & S --> CHART[Biểu đồ / bảng tổng hợp]
```

---

## 7. Admin

```mermaid
flowchart TD
    LOGIN([Đăng nhập admin]) --> DASH[/admin/dashboard/]
    DASH --> STATS[Thống kê user, series, role]

    DASH --> USERS[/admin/users/]
    USERS --> CREATE[/admin/users/create/]
    USERS --> DETAIL[/admin/users/{id}/]
    DETAIL --> EDIT[/admin/users/{id}/edit/]

    CREATE & EDIT --> API_P[GET/PUT/DELETE /api/profiles]
    API_P --> ROLE[Đổi role, is_active]

    DASH --> ROLES[/admin/roles/]
    DASH --> ACT[/admin/activity/]
    ACT --> LOG[GET /api/activity-logs\nfilter, stats]

    DASH --> SET[/admin/settings/]

    subgraph Override quyền
        ADMIN_ANY[Admin có thể:\n- Đổi mọi series status\n- Xem mọi data\n- Xóa series/chapter]
    end
```

---

## 8. Luồng Task + Submission

### 8.1 State machine đầy đủ

```mermaid
stateDiagram-v2
    direction LR

  state "Task" as Task {
        [*] --> todo
        todo --> in_progress
        in_progress --> submitted
        submitted --> approved
        submitted --> rejected
        rejected --> in_progress
    }

  state "Submission" as Sub {
        [*] --> sub_submitted: Assistant nộp
        sub_submitted --> sub_approved: Mangaka duyệt
        sub_submitted --> sub_rejected: Mangaka từ chối
    }

  state "Payment" as Pay {
        unpaid --> pending: Tạo URL VNPay
        pending --> paid: Callback thành công
        pending --> unpaid: Thanh toán thất bại
    }

    submitted --> sub_submitted
    sub_approved --> approved
    approved --> unpaid
    paid --> [*]
```

### 8.2 Sequence: từ giao task đến trả tiền

```mermaid
sequenceDiagram
    actor M as Mangaka
    actor A as Assistant
    participant BE as Backend

    M->>BE: POST /api/tasks (page, assistant, price, region)
    Note over BE: task.status = todo
    A->>BE: PATCH /api/tasks/{id}/status → in_progress
    A->>BE: POST /api/submissions (file, note)
    Note over BE: task.status = submitted
    M->>BE: PATCH /api/submissions/{id} approve=true
    Note over BE: task.status = approved
    M->>BE: POST /api/tasks/{id}/payment
    BE-->>M: paymentUrl
    M->>M: Redirect VNPay
    BE->>BE: IPN/return verify
    Note over BE: payment_status = paid
```

### 8.3 Loại task (task_type)

```mermaid
mindmap
  root((Task Types))
    background
    shading
    cleanup
    speech_bubble
    effects
    lineart
    other
```

---

## 9. Luồng thanh toán (Admin payroll)

> VNPay từng-task trên FE đã gỡ. Chi trả qua `/admin/payroll` (ngày 5). Chi tiết: [ROLE-WORKFLOWS.md](./ROLE-WORKFLOWS.md#luồng-thanh-toán-admin-payroll).

```mermaid
sequenceDiagram
    participant M as Mangaka
    participant A as Assistant
    participant AD as Admin
    participant BE as Backend

    M->>BE: Duyệt task (approved)
    Note over BE: Task vào kỳ payroll tháng
    AD->>BE: GET payroll summaries
    AD->>BE: Mark paid
    BE-->>A: payment_status = paid
```

---

## 10. Luồng mời Assistant / Editor

### 10.1 Mời Assistant (studio)

```mermaid
sequenceDiagram
    actor M as Mangaka
    actor A as Assistant
    participant BE as API

    M->>BE: POST /api/profiles/assistants/invite
    Note over BE: mangaka_assistants.status = pending
    A->>BE: GET invitations
    A->>BE: PATCH respond accept/reject
    alt accepted
        Note over BE: status = accepted
        M->>BE: POST /api/tasks assigned_to = assistant
    else rejected
        Note over BE: status = rejected
    end
```

### 10.2 Mời Editor (series)

```mermaid
sequenceDiagram
    actor M as Mangaka
    actor E as Editor
    participant BE as API

    Note over M: Series phải approved
    M->>BE: POST /api/series/{id}/editor-invitations
    Note over BE: invitation.status = pending
    E->>BE: GET /api/series/editor-invitations/mine
    E->>BE: PATCH .../accept hoặc reject
    alt accepted
        BE->>BE: series.editor_id = editor
    end
```

---

## 11. Luồng Auth & chung

### 11.1 Đăng nhập / đăng ký

```mermaid
flowchart TD
    GUEST([Khách]) --> LAND[/ Landing /]
    LAND --> LOGIN[/login/]
    LAND --> REG[/register/]

    LOGIN --> EMAIL[POST /api/auth/login]
    REG --> REGAPI[POST /api/auth/register]

    LOGIN --> GOOGLE[Google OAuth]
    GOOGLE --> CB[/auth/google/callback/]
    CB --> TOKEN[Lưu JWT + user localStorage]

    TOKEN --> ROUTE{role?}
    ROUTE -->|mangaka| MD[/mangaka/dashboard/]
    ROUTE -->|assistant| AD[/assistant/dashboard/]
    ROUTE -->|editor| ED[/editor/dashboard/]
    ROUTE -->|board| BD[/board/dashboard/]
    ROUTE -->|admin| ADM[/admin/dashboard/]
```

### 11.2 Tính năng chung mọi role

```mermaid
flowchart LR
    subgraph Common
        N[/notifications/\nGET /api/notifications]
        P[/profile/\nGET/PUT profiles/me]
        S[/settings/]
        LOGOUT[POST /api/auth/logout]
    end

    N --> READ[Đánh dấu đã đọc]
    P --> AVATAR[Cập nhật avatar, bio]
```

---

## 12. Sơ đồ phụ thuộc quyền (ai làm được gì)

```mermaid
flowchart TB
    subgraph Series status change
        M1[Mangaka author] -->|draft, pending_review, hiatus| SS1[PUT series/status]
        E1[Editor assigned] -->|publishing, completed, hiatus| SS1
        B1[Board] -->|vote only pending| VOTE[POST board/votes]
        A1[Admin] -->|any status| SS1
    end

    subgraph Task
        M2[Mangaka/Editor] -->|create, review, pay| T1[Tasks API]
        AS2[Assistant] -->|in_progress, submit| T1
        AD2[Admin] -->|all| T1
    end

    subgraph Publishing schedule
        B2[Board] -->|series completed| PS1[POST publishing-schedules]
        AD3[Admin] -->|all| PS1
    end
```

### Ma trận tóm tắt

| Hành động | Mangaka | Assistant | Editor | Board | Admin |
|-----------|:-------:|:---------:|:------:|:-----:|:-----:|
| Tạo series | ✓ | | | | ✓ |
| Nộp duyệt series | ✓ | | | | ✓ |
| Vote duyệt series | | | | ✓ | |
| Sản xuất chapter | ✓* | | | | ✓ |
| Giao task | ✓ | | ✓** | | ✓ |
| Làm & nộp task | | ✓ | | | |
| Review submission | ✓ | | ✓** | | ✓ |
| Thanh toán VNPay | ✓ | | ✓** | | ✓ |
| Review chapter | | | ✓ | | ✓ |
| Nhập ranking | | | | ✓ | ✓ |
| Lịch xuất bản | | | | ✓ | ✓ |
| Danger decision | | | | ✓ | |
| Quản lý user | | | | | ✓ |

\* Sau khi series `approved`  
\*\* Editor chỉ trên series được gán

---

## Liên kết tài liệu

| File | Nội dung |
|------|----------|
| [ROLE-WORKFLOWS.md](./ROLE-WORKFLOWS.md) | Mô tả văn bản, bảng API, menu |
| [FE-BE-INTEGRATION-PLAN.md](./FE-BE-INTEGRATION-PLAN.md) | Kế hoạch tích hợp FE–BE |
| `scripts/supabase-seed-sample-data.sql` | Dữ liệu demo |

---

*Sơ đồ đồng bộ với quorum board = 3 phiếu (`BoardService.MinimumBoardVotesForDecision`).*
