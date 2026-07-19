# Backend - ASP.NET Core Web API

Backend sử dụng ASP.NET Core, EF Core và PostgreSQL/Supabase. Kiến trúc chính:

```text
Controller -> Service -> UnitOfWork/Repository -> AppDbContext
```

## Cấu hình và chạy

Copy `BE/appsettings.example.json` → `BE/appsettings.Development.json` và điền secret local (file Development đã gitignore).  
`BE/appsettings.json` trong repo chỉ chứa placeholder.

Cấu hình `Cors:AllowedOrigins` cho origin FE (mặc định Vite localhost:5173).

```bash
dotnet restore
dotnet ef database update --project DAL --startup-project BE
dotnet run --project BE
```

Swagger mặc định: `https://localhost:7054/swagger`

## Role

Role được lưu tại `profiles.role` bằng PostgreSQL enum `user_role`.

- `mangaka`: quản lý series, chapter, studio assistant và giao task.
- `assistant`: nhận task, thực hiện và gửi submission.
- `editor`: quản lý workflow biên tập.
- `board`: duyệt và xếp hạng.
- `admin`: quản trị hệ thống.

Tài khoản mới đăng ký mặc định có role `assistant`.

## Mangaka Assistant

Quan hệ studio được lưu trong bảng `mangaka_assistants`:

| Column | Mô tả |
|---|---|
| `mangaka_id` | Profile mangaka sở hữu studio |
| `assistant_id` | Profile assistant được thêm vào studio |
| `status` | `pending`, `accepted` hoặc `rejected` |
| `created_at` | Thời điểm thêm |
| `responded_at` | Thời điểm assistant phản hồi |

Khóa chính gồm `(mangaka_id, assistant_id)`, vì vậy một assistant có thể thuộc nhiều studio nhưng không thể bị thêm trùng trong cùng một studio.

Quy tắc:

- Chỉ mangaka được quản lý danh sách assistant của chính mình.
- Chỉ profile đang hoạt động với role `assistant` có thể được mời.
- Lời mời mới có trạng thái `pending`; assistant phải chấp nhận hoặc từ chối.
- Khi mangaka tạo hoặc cập nhật assignment, backend bắt buộc quan hệ có trạng thái `accepted`.
- Admin và editor giữ quyền assign hiện tại theo workflow.

### Assistant API - `/api/profiles/assistants`

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/profiles/assistants` | mangaka | Danh sách assistant trong studio hiện tại |
| POST | `/api/profiles/assistants` | mangaka | Gửi lời mời bằng email |
| GET | `/api/profiles/assistants/invitations/sent` | mangaka | Xem các lời mời đã gửi |
| GET | `/api/profiles/assistants/invitations/mine` | assistant | Xem lời mời nhận được |
| PATCH | `/api/profiles/assistants/invitations/{mangakaId}/accept` | assistant | Chấp nhận lời mời |
| PATCH | `/api/profiles/assistants/invitations/{mangakaId}/reject` | assistant | Từ chối lời mời |
| DELETE | `/api/profiles/assistants/{assistantId}` | mangaka | Hủy lời mời hoặc gỡ assistant |

Request thêm assistant:

```json
{
  "email": "assistant@example.com"
}
```

## API chính

### Auth - `/api/auth`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/register` | Đăng ký |
| POST | `/login` | Đăng nhập |
| POST | `/refresh-token` | Refresh token |
| POST | `/logout` | Đăng xuất |
| GET | `/me` | Người dùng hiện tại |

### Profiles - `/api/profiles`

| Method | Endpoint | Role |
|---|---|---|
| GET | `/me` | đã đăng nhập |
| PUT | `/update` | owner |
| GET | `/` | admin |
| GET | `/{id}` | đã đăng nhập |
| GET | `/editors` | admin |
| PUT | `/{id}` | owner hoặc admin |
| DELETE | `/{id}` | admin |

### Tasks và Kanban

| Method | Endpoint | Role / Quy tắc |
|---|---|---|
| GET | `/api/chapters/{chapterId}/kanban` | mangaka, assistant, staff |
| GET | `/api/tasks/my` | assistant |
| POST | `/api/pages/{pageId}/tasks` | mangaka, editor, admin |
| GET | `/api/tasks/{id}` | theo quyền xem |
| PUT | `/api/tasks/{id}` | người có quyền assign |
| PATCH | `/api/tasks/{id}/status` | theo workflow task |
| DELETE | `/api/tasks/{id}` | người có quyền assign |

Mangaka chỉ có thể truyền `assignedTo` là ID của assistant đã chấp nhận lời mời vào studio.

### Series và Chapter

| Method | Endpoint | Role / Quy tắc |
|---|---|---|
| GET | `/api/series/catalog` | public |
| GET | `/api/series/my-series` | mangaka |
| POST | `/api/series` | mangaka, admin |
| PUT | `/api/series/{id}` | author, assigned editor, admin |
| GET/POST | `/api/series/{seriesId}/chapters` | theo quyền series |
| GET/PUT | `/api/chapters/{id}` | theo quyền series |

### Submissions

| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/tasks/{taskId}/submissions` | assignee hoặc người quản lý |
| POST | `/api/tasks/{taskId}/submissions` | assigned assistant |
| PATCH | `/api/submissions/{id}/review` | mangaka, editor, admin |
| GET | `/api/assistants/me/earnings` | assistant |

## Migration

Migration cho quan hệ studio assistant:

```text
DAL/Migrations/20260606014612_AddMangakaAssistants.cs
DAL/Migrations/20260606020311_AddAssistantInvitationStatus.cs
```

Áp dụng migration:

```bash
dotnet ef database update --project DAL --startup-project BE
```

Ứng dụng cũng đảm bảo bảng `mangaka_assistants` tồn tại khi backend khởi động để tương thích với database hiện tại.

## K. ACTIVITY & GIÁM SÁT — `/api/activity-logs`

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/` | admin, editor, board — lọc `userId`, `action`, `entityType`, `entityId`, `from`, `to`, `page`, `limit` |
| GET | `/me` | đã login — nhật ký của mình |
| GET | `/stats` | admin, editor, board — thống kê 24h / 7 ngày / theo action |
| GET | `/series/{seriesId}` | staff hoặc author/editor của series |
| GET | `/{id}` | staff hoặc owner log |
| POST | `/` | admin, editor, board — ghi log thủ công |

`ActivityLogService.LogAsync` dùng nội bộ để các module khác ghi audit sau này.

Xem `PRN232v1.http` để test.
