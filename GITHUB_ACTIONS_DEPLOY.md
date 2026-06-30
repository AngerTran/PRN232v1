# GitHub Actions Deploy

Workflow deploy nam o `.github/workflows/deploy.yml`.

Moi lan push len branch `main`, GitHub Actions se:

1. Build BE bang .NET 9.
2. Build FE bang Node 22.
3. Build Docker images `img-dotnet` va `img-fe` tren GitHub de kiem tra Dockerfile.
4. SSH vao server.
5. `cd /root/PRN232v1`, pull code moi tu `origin/main`.
6. Chay EF Core migrations len Supabase (container tam `mcr.microsoft.com/dotnet/sdk:9.0`, dung `ConnectionStrings__SupabaseConnection` tu `.deploy/be.env`).
7. Build Docker images tren server va restart containers:
   - BE: `cons-dotnet`, public port `3001`
   - FE: `cons-fe`, public port `3002`, nginx proxy `/api/` -> BE (same-origin, ho tro HTTPS qua domain nhu `www.chaydev.me`)

## GitHub Secrets Can Tao

Vao GitHub repo -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.

Bat buoc:

```text
SSH_HOST=146.190.94.40
SSH_USER=root
SSH_PRIVATE_KEY=<private key de SSH vao server>
```

Neu chua co SSH key rieng cho GitHub Actions, tao key tren may local:

```bash
ssh-keygen -t ed25519 -C "github-actions-prn232" -f ./prn232_github_actions
ssh-copy-id -i ./prn232_github_actions.pub root@146.190.94.40
```

Noi dung file `prn232_github_actions` la gia tri cua secret `SSH_PRIVATE_KEY`.
Khong commit file private key nay len GitHub.

Neu SSH server khong dung port 22 thi them:

```text
SSH_PORT=22
```

Bat buoc neu muon migration tu dong chay sau moi deploy (neu thieu, workflow se fail o buoc migrate):

```text
SUPABASE_CONNECTION_STRING=<connection string postgres cua Supabase>
```

Nen them de deploy khong phu thuoc vao secret dang hard-code trong `appsettings.json`:

```text
SUPABASE_URL=https://icoplbjqykxtpguxmcbf.supabase.co
SUPABASE_ANON_KEY=<supabase anon/publishable key>
SUPABASE_JWT_SECRET=<supabase jwt secret>
CLOUDINARY_CLOUD_NAME=<cloudinary cloud name>
CLOUDINARY_API_KEY=<cloudinary api key>
CLOUDINARY_API_SECRET=<cloudinary api secret>
CLOUDINARY_UPLOAD_PRESET=<upload preset>
```

## Chuan Bi Server

Server can co Docker, Git, va user SSH phai chay duoc lenh `docker`.
Source code tren server phai nam dung duong dan:

```text
/root/PRN232v1
```

Neu dung user `root`, thu lenh nay tren may local:

```bash
ssh root@146.190.94.40 "docker ps"
```

Kiem tra repo source tren server:

```bash
ssh root@146.190.94.40 "cd /root/PRN232v1 && git status && git remote -v"
```

## Supabase Redirect URL

Supabase Authentication -> URL Configuration:

```text
Site URL:
http://146.190.94.40:3002

Redirect URLs:
http://146.190.94.40:3002/auth/google/callback
http://localhost:5173/auth/google/callback
```

## Chay Thu

Sau khi them secrets, vao tab `Actions` tren GitHub, chon `Build and Deploy`, bam `Run workflow`.

Kiem tra sau khi deploy:

```bash
curl http://146.190.94.40:3001/swagger/index.html
curl http://146.190.94.40:3002
curl http://146.190.94.40:3001/api/auth/google/supabase-url
```
