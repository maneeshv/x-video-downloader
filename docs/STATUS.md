Updated: 2026-08-29

## Now
- Tasks 1–4 done (scaffold, limits, bookmarks parser, OAuth/API calls). Executing `docs/superpowers/plans/2026-08-29-v1-worker.md` (spec APPROVED 2026-08-29); Task 5 next, then 6–8, TDD, subagent-driven. Product code is now allowed.

## Next
1. Task 9 of the plan: create R2/KV/D1, migrate, deploy, enable Access, secrets, X callback URL, `/oauth/start`, one `/backfill`.
2. Runbook `docs/runbooks/deploy.md`; rewrite `docs/ARCHITECTURE.md` as built; prune `docs/GOTCHAS.md`; `Last verified` on runbooks.
3. Observe the first week: cron events, console.x.com usage (Owned-Reads rate?), Error 1102 on downloads → Workers Paid.
4. v2 (owner intent): list/search/filter UI over the `bookmarks` table.

## Blocked
- Task 9 needs from the owner: (a) **OAuth 2.0 Client ID + Client Secret** from the X app's *User authentication settings* (the `.env` keys are OAuth 1.0a consumer key/secret + app-only bearer, which cannot read bookmarks) — add them to `.env` as `X_CLIENT_ID` / `X_CLIENT_SECRET`; (b) **`TELEGRAM_CHAT_ID`** — message the bot once, then the agent reads it via `getUpdates`.
- Enabling Cloudflare Access on the workers.dev route is a dashboard click (owner, or agent via the authenticated Cloudflare MCP once `/mcp` is authorized).

## Done recently
- 2026-08-29 Task 4: OAuth 2.0 PKCE + token exchange/refresh + fetchMe/fetchBookmarks (`src/x.ts`), `test/x.oauth.test.ts`, `test/fakes.ts` (fakeFetch + fixture loader).
- 2026-08-29 Task 3: bookmarks parser (selectVariant, parseBookmarks) with fixture and TDD tests.
- 2026-08-29 Task 2: limits.ts with 19 hard caps and X API constants (ADR-0005 compile-time design).
- 2026-08-29 Task 1 typecheck split: Node globals scoped to `tsconfig.test.json` only (`src/` stays workerd-only); stale JOURNAL line fixed; ADR-0006 amended again.
- 2026-08-29 Spec approved; plan written (9 tasks); ADR-0006 amended (`#src/*` imports).
- 2026-08-29 `docs/GOTCHAS.md`, `docs/runbooks/agent-setup.md`, CLAUDE.md rule 7, ADR-0007 (D1 index), ADR-0008 (single Worker).
- 2026-08-29 Owner decided official X API (ADRs 0002–0006); X API v2 research; runbooks for X app setup and re-auth.
- 2026-08-29 Repo scaffold, docs-as-memory system, five-persona brainstorm, initial spec.
