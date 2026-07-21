# Deploying to zeron.meavo.app (Vercel)

Zeron Material Checker runs on **Vercel** (`fra1`), same pattern as Clock, Hols, and Assembly.

## Architecture

```text
zeron.meavo.app (Vercel)
   ├── Next.js admin UI
   ├── Google Sheets sync + CSV import
   └── Postgres (Neon) — Zeron* tables
```

## 1. Database

This app currently owns its own Prisma schema (not yet merged into `meavo-db`).
Use a **dedicated Neon Postgres** database (do not `db:push` this schema against the shared Meavo DB).

```bash
# After DATABASE_URL is set locally:
npm run db:push
npm run db:seed
```

## 2. Vercel project

```bash
vercel link          # meavo-gateway / zeron-material-checker
vercel env pull .env.local
vercel --prod
```

## 3. Required environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Long random secret |
| `AUTH_URL` | `https://zeron.meavo.app` |
| `ADMIN_EMAIL` | Bootstrap admin email |
| `ADMIN_PASSWORD` | Bootstrap admin password (seed only) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets service account JSON |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Workbook ID |
| `CRON_SECRET` | Protects `/api/cron/sync-sheet` |
| `NEXT_PUBLIC_APP_URL` | `https://zeron.meavo.app` |

## 4. DNS

```text
zeron.meavo.app  →  cname.vercel-dns.com
```

Then in Vercel → Project → Domains → add `zeron.meavo.app`.

## 5. Google Sheets

Share the workbook with the service account email from `GOOGLE_SERVICE_ACCOUNT_JSON`.

## 6. Post-deploy seed

```bash
# With production DATABASE_URL available locally:
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
```

## 7. Smoke checks

- `https://zeron.meavo.app/api/health`
- Sign in at `/login`
- Sync sheet from `/sync`
