# Nuriek Core

Internal HR and operations portal for Nuriek (`@nuriek.com` accounts).

## Features

- Role-based portal (Super Admin, HR, Manager, Team Lead, Employee, Intern, Contractor)
- Attendance check-in/out with break tracking
- Timesheets, leave management, and holidays
- Document signing and company drive (authenticated file access)
- Intern performance, reports, and certificate requests
- Audit logging for sensitive actions

## Prerequisites

- Node.js 20+
- PostgreSQL (local via Docker, or a hosted provider like [Neon](https://neon.tech))

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

Edit `.env` and set a real `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

2. Start PostgreSQL (pick one option):

**Option A — Docker (recommended)**

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then:

```bash
docker compose up -d
```

**Option B — Homebrew**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb nuriek_core
```

Update `DATABASE_URL` in `.env` to match your local Postgres user/password.

3. Install dependencies:

```bash
npm install
```

4. Apply database schema:

**Local Postgres**

```bash
npx prisma migrate deploy
npx prisma generate
```

**Neon** — use two URLs in `.env`:

```env
DATABASE_URL="postgresql://...@ep-xxx-pooler....neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://...@ep-xxx....neon.tech/neondb?sslmode=require"
```

(`DIRECT_URL` is the non-pooler host from the Neon dashboard — used for migrations.)

```bash
npx prisma migrate deploy
npx prisma generate
```

If `migrate deploy` times out on advisory locks, the schema may already be synced. Use `npx prisma db push` for dev, or retry after closing other DB connections in the Neon console.

4. Seed demo users (optional):

```bash
npx tsx seed.ts
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Default seeded accounts

| Email | Role | Notes |
|-------|------|--------|
| admin@nuriek.com | Super Admin | Password in seed script output |
| hr@nuriek.com | HR Admin | |
| john@nuriek.com | Employee | |
| sarah@nuriek.com | Intern | |

Change passwords after first login in production.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## Security notes

- All portal routes require authentication (middleware).
- Uploaded files are stored in `storage/uploads` and served only via `/api/files/[filename]` after session check.
- New users receive a one-time temporary password and must change it on first login.
- Login attempts are rate-limited per email.

## Deployment

Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and Zoho SMTP variables in your hosting provider. Run `prisma migrate deploy` before starting the app. Ensure `storage/uploads` is on persistent disk or migrate to object storage for multi-instance deploys.
