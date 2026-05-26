# PRN232v1

Monorepo gồm backend API và frontend (khi có).

## Cấu trúc

```
PRN232v1/
├── BE/          # ASP.NET Core Web API (REST)
├── FE/          # Frontend (chưa khởi tạo — xem FE/README.md)
├── PRN232v1.slnx
└── README.md
```

## Backend (BE)

```bash
cd BE
dotnet run
```

- Swagger: https://localhost:7054/swagger
- Cấu hình: copy `appsettings.Development.example.json` → `appsettings.Development.json`

## Frontend (FE)

Tạo project FE trong thư mục `FE/` và gọi API tại `BE`.
