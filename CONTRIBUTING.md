<!-- BEGIN MEAVO RELEASE POLICY -->
## Branches and production permission

Create `feat/`, `fix/`, or `chore/` branches from `staging` and open PRs explicitly into `staging`; squash after required checks pass. Never push directly to `main` or `staging`. Production releases use a `staging` → `main` PR and a merge commit. The only human gate is that merge: AI agents list every release PR in the bundle with its scope and production steps (release tag, production SQL) and wait for one human yes, which covers the whole bundle. No second account or formal approving review is required. Everything before the merge, including staging integration and staging database changes, is agent work. See [RELEASE_POLICY.md](RELEASE_POLICY.md) for the environment checks; missing staging does not authorize a main release.
<!-- END MEAVO RELEASE POLICY -->

## Schema changes

Only in [meavo-db](https://github.com/meavo-booths/meavo-db): edit the schema there, prepare the release through `staging` under its release policy, then re-pin `@meavo/db` here with a PR into `staging`. This repo carries no Prisma schema and no SQL scripts, and nothing is applied to a database from it: `npm run db:push` is disabled (one shared database), and `postinstall`/`build` only run `prisma generate`. This also holds for the `Zeron*` tables that only this app writes: their SQL is written and applied in meavo-db, so do not add `scripts/*.sql` here or run `prisma db execute` from this repo.
