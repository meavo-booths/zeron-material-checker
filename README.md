# Zeron Material Checker

**Release gate:** Follow [RELEASE_POLICY.md](RELEASE_POLICY.md). Prepare changes on `feat/*` branches and validate through `staging`. Production deployments, rollbacks, live database changes, release tags, and production configuration changes require specific human approval for that action and revision; this runbook is not approval. Use isolated non-production data and integrations for preview checks.

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
- Prisma + Postgres (Neon)
- NextAuth credentials login
- Google Sheets API (service account)
- Vercel (`fra1`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Apply Zeron tables with the idempotent SQL script (never `prisma db push` against the shared Meavo DB):

```bash
npm run db:execute-zeron
npm run db:seed
```

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
- `npm run build` — production build
- `npm run db:execute-zeron` — apply Zeron tables (idempotent SQL)
- `npm test` — run parser/outlier tests

## Cron sync

`vercel.json` registers `/api/cron/sync-sheet` every 6 hours. Protect it with `CRON_SECRET`.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://zeron.meavo.app/api/cron/sync-sheet
```
