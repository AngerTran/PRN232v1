# MangaFlow Frontend

Frontend React + TypeScript + Vite cho hệ thống quản lý quy trình sáng tác manga.

## Chạy frontend

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

## Quản lý Assistant của Mangaka

Mangaka quản lý assistant tại:

```text
/mangaka/assistants
```

Luồng sử dụng:

1. Assistant đăng ký tài khoản và có role `assistant`.
2. Mangaka mở mục **Trợ lý** và gửi lời mời bằng email.
3. Assistant mở mục **Lời mời studio** và chấp nhận hoặc từ chối.
4. Workspace tải danh sách assistant đã chấp nhận từ `GET /api/profiles/assistants`.
5. Mangaka chỉ có thể chọn các assistant đã chấp nhận khi giao task.

Trang quản lý hỗ trợ:

- Xem assistant thuộc studio.
- Gửi lời mời assistant bằng email.
- Theo dõi trạng thái chờ xác nhận, đã chấp nhận hoặc đã từ chối.
- Gỡ assistant khỏi studio.
- Hiển thị lỗi từ backend nếu email không tồn tại hoặc không phải role `assistant`.

Các service liên quan:

```text
src/services/profilesApi.ts
src/services/workspaceApi.ts
```

Trang và component liên quan:

```text
src/pages/mangaka/AssistantsPage.tsx
src/pages/assistant/StudioInvitationsPage.tsx
src/pages/mangaka/WorkspacePage.tsx
src/components/workspace/TaskPanel.tsx
```
