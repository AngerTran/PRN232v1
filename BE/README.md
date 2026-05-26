# BE — Supabase Auth + Profile API

**Controller → Service → Repository** — không gọi `DbContext` trực tiếp từ Controller/Service.

## Cấu hình

`appsettings.Development.json`: connection string, `Supabase:AnonKey`, `Supabase:JwtSecret`, `Google:*`.

Role lưu trong cột `profiles.role` (enum `user_role` trên Supabase).

## Chạy

```bash
cd BE
dotnet run
```

Swagger: https://localhost:7054/swagger

## I. AUTH — `/api/auth`

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/register` | Đăng ký |
| POST | `/login` | Đăng nhập |
| POST | `/refresh-token` | Refresh token |
| POST | `/logout` | Logout |
| GET | `/me` | Current user |
| PUT | `/profile` | Sửa profile của mình |

## II. PROFILE — `/api/profiles`

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/` | admin |
| GET | `/{id}` | all (đã login) |
| GET | `/assistants` | mangaka |
| GET | `/editors` | admin |
| PUT | `/{id}` | owner hoặc admin |
| DELETE | `/{id}` | admin (soft-delete `is_active=false`) |

Phân quyền đọc `role` từ bảng `profiles` (không dựa JWT claim).

User mới đăng ký mặc định `role = assistant`. Đổi role admin: cập nhật DB hoặc `PUT` bởi admin (field `role`).

Xem `PRN232v1.http` để test.
