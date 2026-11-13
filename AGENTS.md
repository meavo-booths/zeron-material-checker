<!-- BEGIN MEAVO RELEASE POLICY -->
## Release safety — mandatory for all AI agents

- **The only human gate is merging `staging` → `main`.** Everything before it is agent work: create `feat/`, `fix/`, or `chore/` branches from `staging`, open PRs into `staging`, and squash-merge or enable auto-merge once checks pass, without asking.
- Agents may also write to verified staging resources (staging DB scripts and data, staging deployments), re-pin dependencies to approved tags through `staging`, open release PRs, and run read-only production queries through the guarded helper.
- To release, list every release PR in the bundle with its scope and production steps (release tag, production SQL) in one message and wait for one human yes. That yes covers the bundle, including re-pins to the approved tag; ask again only if `staging` gains unrelated changes. Merge releases with a merge commit.
- Never push directly to `main`/`staging`, bypass protections, or change production outside an approved release. From staging, never touch records in an external system shared with production.
- Read [RELEASE_POLICY.md](RELEASE_POLICY.md) before release, deployment, environment, schema, or tag work. Verify actual environment destinations before writes.
<!-- END MEAVO RELEASE POLICY -->

## Database schema

- The schema lives in [meavo-db](https://github.com/meavo-booths/meavo-db), the only repository allowed to alter the shared MEAVO Postgres database. This app consumes it as `@meavo/db`, pinned to a release tag in `package.json`, and points Prisma at `node_modules/@meavo/db/prisma/schema.prisma`.
- Nothing is applied from this repo. It carries no Prisma schema and no SQL scripts; `postinstall` and `build` only run `prisma generate`, which reads the installed schema and never connects to a database. `npm run db:push` is disabled on purpose. Do not add `prisma/schema.prisma` or `scripts/*.sql` here, and do not run `prisma db push`, `prisma db execute` or `prisma migrate` from this repo.
- Schema changes, also for the `Zeron*` tables that only this app writes, are made in meavo-db: edit its schema, write the SQL in its `scripts/`, and follow its release policy. Under [RELEASE_POLICY.md](RELEASE_POLICY.md) that SQL must be transactional and idempotent, run cleanly twice on staging, and reach production only as part of an approved meavo-db release, from its tag.
- To pick up a new tag, re-pin through a PR into `staging`: `npm install "@meavo/db@git+https://github.com/meavo-booths/meavo-db.git#vX.Y.Z"`. npm rewrites the line in `package.json` to the `github:` shorthand; put the `git+https://…#vX.Y.Z` form back, run `npm install` again, and check that `package-lock.json` resolves `@meavo/db` to the commit of that tag.
- MRP also reads `ZeronDeliveryRow`. Keep changes to the Zeron tables backward compatible: add, migrate consumers, then remove in a later release.
