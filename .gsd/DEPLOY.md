# GSD Deployment Guide

## Architecture

```
[Vercel] --> SPA (React Client)
   |
   | HTTPS API calls
   v
[Render Web Service] --> Express Server (Node.js)
   |
   v
[Render PostgreSQL] --> Database
```

## 1. Render Setup (Server + Database)

### A. Create PostgreSQL Database
1. Go to https://dashboard.render.com
2. **New** > **PostgreSQL**
3. Name: `pm-postgres`, Plan: Free, PostgreSQL version: 16
4. Copy the **Internal Database URL** after creation

### B. Create Web Service
1. **New** > **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `pm-server`
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm --filter @pm/shared build && cd packages/server && npx prisma generate && cd ../.. && pnpm --filter @pm/server build`
   - **Start Command**: `cd packages/server && node dist/index.js`
   - **Node Version**: Set env var `NODE_VERSION=20.11.0`

### C. Environment Variables (Render)
| Variable | Value |
|---|---|
| `NODE_VERSION` | `20.11.0` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | (Internal Database URL from step A) |
| `JWT_SECRET` | (generate a secure random string) |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | (your Vercel URL, e.g. `https://your-app.vercel.app`) |

### D. Run Migrations
After the first deploy, open Render Shell and run:
```bash
cd packages/server && npx prisma migrate deploy
```

Or use the Blueprint file (`render.yaml`) at project root for automatic setup.

---

## 2. Vercel Setup (Client)

### A. Import Project
1. Go to https://vercel.com
2. **Import Project** > select your GitHub repo
3. Vercel auto-detects `vercel.json` settings

### B. Environment Variables (Vercel)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-pm-server.onrender.com/api/v1` |
| `VITE_WS_URL` | `wss://your-pm-server.onrender.com` |

### C. Deploy
Vercel deploys automatically on push to `main`.

---

## 3. Post-Deploy Checklist

- [ ] Render health check: `GET https://<render-url>/api/health`
- [ ] Vercel client loads at `https://<vercel-url>`
- [ ] Client can authenticate (login/register)
- [ ] CORS allows Vercel origin on Render server
- [ ] WebSocket connection establishes

---

## Environment Variable Cross-References

The `CLIENT_URL` on Render must match your Vercel deployment URL.
The `VITE_API_URL` on Vercel must point to your Render server.

Supports comma-separated origins in `CLIENT_URL` for multiple environments:
```
CLIENT_URL=https://your-app.vercel.app,https://custom-domain.com
```

---

## Local Development

```bash
docker compose up -d        # Start PostgreSQL + Redis
pnpm install                # Install all dependencies
pnpm db:migrate             # Run migrations
pnpm dev                    # Start client + server
```

Client: http://localhost:5173
Server: http://localhost:3001
