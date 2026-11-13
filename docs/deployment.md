# Deploying to zeron.meavo.app (Vercel)

**Release gate:** Follow [RELEASE_POLICY.md](../RELEASE_POLICY.md). Prepare changes on `feat/*` branches and validate through `staging`. The only human gate is the `staging` → `main` release: one yes covers the release bundle, including its release tag and production SQL. Rollbacks, redeploys and production configuration changes outside a release need their own yes; this runbook is not approval. Use isolated non-production data and integrations for preview checks.

Zeron Material Checker runs on **Vercel** (`fra1`), same pattern as Clock, Hols, and Assembly.

## Architecture

```text
zeron.meavo.app (Vercel)
   ├── Next.js admin UI
   ├── Google Sheets sync + CSV import
   └── Postgres (Neon) — Zeron* tables (schema in meavo-db, consumed as @meavo/db)
```

## 1. Database

Zeron tables live on the **shared Meavo Neon Postgres**. Their schema is declared in [meavo-db](https://github.com/meavo-booths/meavo-db) (`prisma/schema.prisma`, Zeron section) and consumed here as `@meavo/db`, pinned to a release tag in `package.json`.

Nothing is applied from this repo: it carries no Prisma schema and no SQL scripts, `npm run db:push` is disabled, and the Vercel build only runs `prisma generate` (which reads `node_modules/@meavo/db/prisma/schema.prisma` and never connects to a database) before `next build`.

Schema changes, also for tables that only Zeron uses, are written and applied in meavo-db. Under [RELEASE_POLICY.md](../RELEASE_POLICY.md) their SQL reaches production only as part of an approved meavo-db release, from its tag; afterwards re-pin `@meavo/db` here through a PR into `staging`. A deployment of this app needs every column of the pinned schema's `User`, `Account`, `ToolCardAccess` and `Zeron*` tables to exist in the database it connects to, so pin only tags whose SQL has been applied there.

`meavo-db` is a public repository, so `npm install` on Vercel and in CI needs no token or deploy key.

## 2. Gateway tool card

Grant access via the meavo.app gateway (same as other apps):

```bash
cd ~/Desktop/CursorAI/meavo-gateway
npx tsx --env-file=.env.local scripts/seed-zeron-tool-card.ts
```

Admins get the **Zeron Materials** card automatically. Grant other users access from the gateway admin UI.

## 3. Vercel project

```bash
vercel link          # meavo-gateway / zeron-material-checker
vercel env pull .env.preview.local --environment=preview
# Verify isolated preview database/integrations before running the app.
```

Push a `feat/*` branch for its preview and open the PR against `staging`. A production release from `staging` to `main` needs one human yes under [RELEASE_POLICY.md](../RELEASE_POLICY.md).

## 3. Required environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Long random secret |
| `AUTH_URL` | `https://zeron.meavo.app` |
| `AUTH_GOOGLE_ID` | Same Google OAuth client as other Meavo apps |
| `AUTH_GOOGLE_SECRET` | Same Google OAuth secret |
| `ZERON_TOOL_CARD_ID` | `seed-zeron-tool` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets service account JSON |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Workbook ID |
| `CRON_SECRET` | Protects `/api/cron/sync-sheet` |
| `NEXT_PUBLIC_APP_URL` | `https://zeron.meavo.app` |
| `NEXT_PUBLIC_GATEWAY_URL` | `https://meavo.app` |

## 4. DNS

```text
zeron.meavo.app  →  cname.vercel-dns.com
```

Then in Vercel → Project → Domains → add `zeron.meavo.app`.

## 5. Google OAuth

Authorized JavaScript origins / redirect URIs must include:

```text
https://zeron.meavo.app
```

## 6. Post-deploy

No local admin seed. Users must exist in gateway and hold the Zeron tool card.

## 7. Smoke checks

- `https://zeron.meavo.app/api/health`
- Sign in at `/login`
- Sync sheet from `/sync`
