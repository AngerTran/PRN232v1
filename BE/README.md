# BE — Auth API (Supabase)

REST API module **I. AUTH** — đăng nhập email + Google qua Supabase. Dữ liệu `profiles`: **Controller → Service → Repository**.

## Kiến trúc

```
AuthController
    ↓
SupabaseAuthService (HTTP → Supabase Auth)  |  ProfileService → UnitOfWork → Repository<Profile>
```

## Cấu hình

`appsettings.Development.json` (gitignored): connection string, `Supabase:AnonKey`, `Supabase:JwtSecret`, `Google:*`.

## Chạy

```bash
cd BE
dotnet run
```

Swagger: https://localhost:7054/swagger

## I. AUTH APIs — Base URL `/api/auth`

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/register` | Đăng ký |
| POST | `/login` | Đăng nhập |
| POST | `/refresh-token` | Refresh token |
| POST | `/logout` | Logout (Bearer) |
| GET | `/me` | Current user (profile) |
| PUT | `/profile` | Cập nhật profile |

### Bổ sung (Google / sync)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/sync` | Đồng bộ profile sau auth |
| GET | `/google/url` | URL OAuth Google |
| POST | `/google/code` | Login bằng authorization code |
| POST | `/google` | Login bằng `id_token` |

## Profiles (đọc user khác)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/profiles/{id}` | Xem profile theo id |

Xem `PRN232v1.http` để test.
