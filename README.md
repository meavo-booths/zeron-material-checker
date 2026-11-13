# Zeron Material Checker

**Release gate:** Follow [RELEASE_POLICY.md](RELEASE_POLICY.md). Prepare changes on `feat/*` branches and validate through `staging`. The only human gate is the `staging` → `main` release: one yes covers the release bundle, including its release tag and production SQL. Rollbacks, redeploys and production configuration changes outside a release need their own yes; this runbook is not approval. Use isolated non-production data and integrations for preview checks.

Meavo web app for reviewing Zeron delivery exports and highlighting unit-cost outliers by item code.

**Production:** [https://zeron.meavo.app](https://zeron.meavo.app)

## Features

- Sync delivery exports directly from a Google Sheets workbook (one tab per export date)
- CSV upload fallback for manual imports
- Outlier detection when `Ед.себестойност` deviates by more than 10% from the item baseline
- Dashboard with average price excluding outliers, outlier rows, process number, date, and attachment presence (`Име файл`)
- Item detail view with full delivery history

## Stack

- Next.js 15 App Router
- Prisma + Postgres (Neon), schema from `@meavo/db` (see [Database](#database))
- NextAuth credentials login
- Google Sheets API (service account)
- Vercel (`fra1`)

## Database

All MEAVO apps use one Postgres database (Neon). Its schema lives in **[meavo-db](https://github.com/meavo-booths/meavo-db)**, the only repository allowed to alter the database. This app consumes it as `@meavo/db`, pinned to a release tag in `package.json`, and Prisma reads `node_modules/@meavo/db/prisma/schema.prisma`.

Nothing is applied from this repo. It carries no Prisma schema and no SQL scripts; `npm install` and `npm run build` only run `prisma generate`, which reads the installed schema and never connects to a database. `npm run db:push` is disabled.

Schema changes, also for the `Zeron*` tables that only this app writes, are made in meavo-db and released under its policy. Then re-pin `@meavo/db` here through a PR into `staging` (see [AGENTS.md](AGENTS.md)).

## Setup

1. Install dependencies (this also generates the Prisma client from `@meavo/db`):

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. There is no database setup step in this repo. The Zeron tables are part of the shared schema in meavo-db and are applied from there. Users and tool-card access are managed in meavo-gateway (see [Access](#access)).

4. Configure Google Sheets access in `.env`:

- `GOOGLE_SERVICE_ACCOUNT_JSON` — service account JSON string
- `GOOGLE_SHEETS_SPREADSHEET_ID` — workbook ID with dated tabs

Share the spreadsheet with the service account email.

5. Start the app:

```bash
npm run dev
```

## Access

Login is Google-only (`@meavo.com`). Access is granted via the **Zeron Materials** tool card in [meavo.app](https://meavo.app) gateway admin — same pattern as Clock, Hols, and the other satellite apps.

```bash
# In meavo-gateway:
npx tsx --env-file=.env.local scripts/seed-zeron-tool-card.ts
```

## Expected export columns

| Column | Field |
|--------|-------|
| A | Номер на процес |
| B | Дата |
| C | Код артикул |
| D | Име артикул |
| E | Стоково количество |
| F | Мярка |
| G | Ед.себестойност |
| H | Себестойност |
| I | Склад |
| J | Доп.разход |
| K | Тип артикул |
| L | Име файл |

Attachment in Zeron is inferred from column L: non-empty means yes.

## Deploy

See [docs/deployment.md](docs/deployment.md).

## Scripts

- `npm run dev` — local development
- `npm run build` — production build (`prisma generate`, then `next build`)
- `npm run db:generate` — regenerate the Prisma client from `@meavo/db`
- `npm run db:push` — disabled; schema changes go through meavo-db
- `npm test` — run parser/outlier tests

## Cron sync

`vercel.json` registers `/api/cron/sync-sheet` every 6 hours. Protect it with `CRON_SECRET`.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://zeron.meavo.app/api/cron/sync-sheet
```
