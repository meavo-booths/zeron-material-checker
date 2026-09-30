<!-- BEGIN MEAVO RELEASE POLICY -->
## Release safety — mandatory for all AI agents

- Default scope: create `feat/`, `fix/`, or `chore/` branches from `staging`; use PRs into `staging` and squash only after required checks pass.
- After staging integration and verification, present the release PR, current head SHA, changes and checks; **stop and ask for one human approval before main**. The PR author may approve in the conversation or a human-authored PR comment; a clear “yes” to that specific request is sufficient. Never execute feature → staging → main without this checkpoint.
- Do not merge to `main`, enable auto-merge/queue a production PR, or change production without **explicit human approval for this repository, the specific action, and the reviewed PR/head SHA or exact artifact/configuration scope**. Changed scope or head invalidates approval; never infer or generate it. Reuse still-valid approval without asking again.
- Never push directly to `main`/`staging` or bypass protections. Missing `staging` is not permission to use `main`.
- Read [RELEASE_POLICY.md](RELEASE_POLICY.md) before any release, deployment, environment, schema, or tag/package publication action. Verify actual environment destinations before writes.
<!-- END MEAVO RELEASE POLICY -->

<!-- BEGIN WORKSPACE LAYOUT -->
## Workspace and agent entry points

- Identify this repository's owning app before writing. Run app commands and install dependencies from its Git checkout, never from an umbrella workspace root.
- At task start, completion, and after resuming an old chat, look up the ancestor containing `_shared/workspace.json`. If present, read its `AGENTS.md` and `_shared/RELOCATION.md`, resolve this checkout in that registry, and run `python3 <workspace>/_shared/tools/workspace.py check`. Do not reuse historical paths without consulting the relocation index.
- In that workspace, keep source in the app's `repo/` or registered `worktrees/`, task artifacts in its `output/<task>/`, and cross-app artifacts in `_shared/output/`. Reuse an appropriate checkout; create another only with the workspace helper and the base required by `RELEASE_POLICY.md`.
- In a standalone or cloud clone without that registry, this Git checkout is the app boundary. Keep temporary artifacts under ignored `.local/agent-output/`. Do not invent an umbrella root or require unavailable local files. If a second checkout is necessary, use ignored `.local/worktrees/<task>/` inside this app, or the host's managed worktree facility; preserve existing work.
- Never create task folders, package files, or dependency installations beside the app containers. Keep shared database changes in `meavo-db` and shared navigation changes in `meavo-navigation`.
- Preserve uncommitted, untracked, and ignored files before retiring a checkout. Do not force-delete working copies as cleanup.
- `CLAUDE.md` imports this file; Cursor's workspace rule points here. Keep shared guidance here rather than maintaining conflicting agent-specific copies. Read [environment guidance](AGENT_ENVIRONMENTS.md) before environment or deployment work; the existing release-approval policy still applies.
<!-- END WORKSPACE LAYOUT -->
