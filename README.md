# PRN232v1

Monorepo — **BE đã được xóa sạch** để bạn tự tạo lại và kết nối Supabase mới.

## Cấu trúc

```
PRN232v1/
├── BE/          # (trống) — tạo Web API mới tại đây
├── FE/          # Frontend (xem FE/README.md)
├── PRN232v1.slnx
└── README.md
```

## Backend

Tạo project mới trong `BE/` (ví dụ):

```bash
dotnet new webapi -n PRN232v1 -o BE --use-controllers
```

Cấu hình Supabase trong `BE/appsettings.Development.json` (file này nên nằm trong `.gitignore`, không commit password).

## Frontend (FE)

Gọi API từ project trong `FE/` khi đã có BE.
