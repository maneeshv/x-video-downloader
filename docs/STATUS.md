Updated: 2026-08-30

## Now
- Tasks 1–8 done (scaffold, limits, bookmarks parser, OAuth/API calls, `src/store.ts` KV/D1/R2, `src/access.ts` Cloudflare Access JWT, `src/sync.ts` run loop/downloads/breaker/alerts, `src/html.ts` + `src/index.ts` routes/Access gate/scheduled handler). Executing `docs/superpowers/plans/2026-08-29-v1-worker.md` (spec APPROVED 2026-08-29); Task 9 (deploy) next, TDD, subagent-driven. Product code is now allowed.

## Next
1. Task 9 of the plan: create R2/KV/D1, migrate, deploy, enable Access, secrets, X callback URL, `/oauth/start`, one `/backfill`.
2. Runbook `docs/runbooks/deploy.md`; rewrite `docs/ARCHITECTURE.md` as built; prune `docs/GOTCHAS.md`; `Last verified` on runbooks.
3. Observe the first week: cron events, console.x.com usage (Owned-Reads rate?), Error 1102 on downloads → Workers Paid.
4. v2 (owner intent): list/search/filter UI over the `bookmarks` table.

## Blocked
- Task 9 needs from the owner: (a) **OAuth 2.0 Client ID + Client Secret** from the X app's *User authentication settings* (the `.env` keys are OAuth 1.0a consumer key/secret + app-only bearer, which cannot read bookmarks) — add them to `.env` as `X_CLIENT_ID` / `X_CLIENT_SECRET`; (b) **`TELEGRAM_CHAT_ID`** — message the bot once, then the agent reads it via `getUpdates`.
- Enabling Cloudflare Access on the workers.dev route is a dashboard click (owner, or agent via the authenticated Cloudflare MCP once `/mcp` is authorized).

## Done recently
- 2026-08-30 Task 8 review fixes: `src/index.ts`'s `/v/:key` now answers 206 only when the request carries a `Range` header (not whenever R2 reports a range, which is always) via a new `servedRange()` helper covering every `R2Range` shape; `If-None-Match` hits return 304 instead of 412; an undecodable key (`/v/%`) 404s instead of throwing. `test/fakes.ts`'s `FakeR2.get` now matches real R2 (`range` always populated; `onlyIf` support). `test/index.test.ts` now 5 tests.
- 2026-08-30 Task 8: `src/html.ts` (`renderIndex`) + `src/index.ts` (`handle`/`AppEnv`, Access-gated routes, OAuth PKCE flow, `/v/:key` Range streaming, scheduled cron sync). `test/index.test.ts` (4 tests). `wc -l src/*.ts` total 558 lines.
- 2026-08-29 Task 7 review fixes: `src/sync.ts` — permanently-failed items (`failed`, non-`http_5xx`) skip retry entirely; token acquisition moved inside `sync`'s `try` so a 5xx there reaches the breaker; per-video `download()` throws become `pending/exception` instead of aborting the run; a final catch for non-API errors records `lastRun`/`lastError` before rethrowing; `breaker` folds `res.bytes` into `totalBytes`; `alert()` sends Telegram before marking the key and only marks on `res.ok`; dropped dead `api_401` from the clear list. `test/sync.test.ts` now 11 tests.
- 2026-08-29 Task 7 re-review fix: `breaker` now folds `res.bytes` into `totalBytes` once at the top, before any branch — the prior round's fold ran too late and was skipped by the 401 branch's early `needsReauth` return. `test/sync.test.ts` now 12 tests.
- 2026-08-29 Task 7: `src/sync.ts` — `sync` (fetch/parse/download loop, cron vs backfill paging, D1 status writes), `ensureAccessToken` (refresh-ahead + prevRefresh fallback), circuit breaker (401 forced refresh → needs_reauth+pause 24h, 403 pause 24h + alert, 429 pause until reset + alert, 5xx retry via `pending`), `alert`/`clearAlert` (once-per-key Telegram, KV-tracked). `test/sync.test.ts` (8 tests). No dependency; brief's code and tests verbatim (2 controller rulings applied to the test file only).
- 2026-08-29 Task 6: `src/access.ts` — `verifyAccessJwt` (RS256 JWT verify via `crypto.subtle`, JWKS fetched from `${teamDomain}/cdn-cgi/access/certs` and cached module-level for 10 min, checks `iss`/`aud`/`exp`/signature), `test/access.test.ts`, `test/fakes.ts` gains `makeSigner`. No dependency.
- 2026-08-29 Task 5: `src/store.ts` — `Store` class (KV tokens/status/pause/PKCE, D1 idempotent upsert that never downgrades `downloaded`, R2 has/putVideo/getVideo), `test/store.test.ts`, `test/fakes.ts` gains `FakeKV`/`FakeR2`/`FakeD1`/`SCHEMA`.
- 2026-08-29 Task 4: OAuth 2.0 PKCE + token exchange/refresh + fetchMe/fetchBookmarks (`src/x.ts`), `test/x.oauth.test.ts`, `test/fakes.ts` (fakeFetch + fixture loader).
- 2026-08-29 Task 3: bookmarks parser (selectVariant, parseBookmarks) with fixture and TDD tests.
- 2026-08-29 Task 2: limits.ts with 19 hard caps and X API constants (ADR-0005 compile-time design).
- 2026-08-29 Task 1 typecheck split: Node globals scoped to `tsconfig.test.json` only (`src/` stays workerd-only); stale JOURNAL line fixed; ADR-0006 amended again.
- 2026-08-29 Spec approved; plan written (9 tasks); ADR-0006 amended (`#src/*` imports).
- 2026-08-29 `docs/GOTCHAS.md`, `docs/runbooks/agent-setup.md`, CLAUDE.md rule 7, ADR-0007 (D1 index), ADR-0008 (single Worker).
- 2026-08-29 Owner decided official X API (ADRs 0002–0006); X API v2 research; runbooks for X app setup and re-auth.
- 2026-08-29 Repo scaffold, docs-as-memory system, five-persona brainstorm, initial spec.
