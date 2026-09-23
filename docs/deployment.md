# Deploying to zeron.meavo.app (Vercel)

**Release gate:** Follow [RELEASE_POLICY.md](../RELEASE_POLICY.md). Prepare changes on `feat/*` branches and validate through `staging`. Production deployments, rollbacks, live database changes, release tags, and production configuration changes require specific human approval for that action and revision; this runbook is not approval. Use isolated non-production data and integrations for preview checks.

Zeron Material Checker runs on **Vercel** (`fra1`), same pattern as Clock, Hols, and Assembly.

## Architecture

```text
zeron.meavo.app (Vercel)
   ├── Next.js admin UI
   ├── Google Sheets sync + CSV import
   └── Postgres (Neon) — Zeron* tables
```

## 1. Database

Zeron tables live on the **shared Meavo Neon Postgres**. Apply them with the idempotent SQL script (do **not** run `prisma db push` from this app — a partial schema would drop other apps' tables):

```bash
npm run db:execute-zeron
npm run db:seed
```

Longer term, these models should be moved into `meavo-db` and consumed via `@meavo/db`.

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

Push a `feat/*` branch for its preview and open the PR against `staging`. A production release from `staging` to `main` requires specific human approval under [RELEASE_POLICY.md](../RELEASE_POLICY.md).

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
