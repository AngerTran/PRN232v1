# MangaFlow - Manga Creation Workflow

Monorepo quản lý quy trình sáng tác, giao việc cho assistant, duyệt nội dung và xuất bản manga.

## Cấu trúc

```text
PRN232v1/
├── BE/          # ASP.NET Core Web API
├── BLL/         # Services, DTOs và business rules
├── DAL/         # EF Core models, repositories và migrations
├── FE/          # React + Vite frontend
└── PRN232v1.slnx
```

## Mangaka và Assistant

- Assistant cần có tài khoản với role `assistant`.
- Mangaka gửi lời mời assistant bằng email tại trang `/mangaka/assistants`.
- Assistant xác nhận hoặc từ chối tại trang `/assistant/invitations`.
- Một assistant có thể làm việc cho nhiều mangaka.
- Danh sách giao task trong workspace chỉ hiển thị assistant đã chấp nhận lời mời.
- Backend kiểm tra quyền khi tạo hoặc cập nhật task. Mangaka không thể assign task cho assistant ngoài studio.
- Gỡ assistant khỏi studio không xóa tài khoản hoặc các task đã giao trước đó, nhưng mangaka không thể giao task mới cho assistant đó.

## Chạy backend

Cấu hình `BE/appsettings.json` (tham khảo `BE/appsettings.example.json` nếu cần).

```bash
dotnet restore
dotnet ef database update --project DAL --startup-project BE
dotnet run --project BE
```

Swagger mặc định: `https://localhost:7054/swagger`

## Chạy frontend

```bash
cd FE
npm install
npm run dev
```

## Build

```bash
dotnet build PRN232v1.slnx
cd FE
npm run build
```

Xem thêm:

- Backend API: `BE/README.md`
- Frontend: `FE/README.md`
