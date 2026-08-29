# Architecture (as built)

Updated: 2026-08-30

Single Cloudflare Worker, `x-downloader`, deployed to `https://x-downloader.x-downloader.workers.dev`
(ADR-0008: one Worker, no queue — fetch and download happen in the same cron run). Deployed but
dormant as of 2026-08-30: no Access policy, no X OAuth client, no chat id (`docs/STATUS.md`).

## Runtime
- `[triggers] crons = ["*/30 * * * *"]` — `scheduled()` calls `sync(deps, {})` (cron mode: 1 page, `PAGE_SIZE=20`).
- `fetch()` — `handle()` in `src/index.ts`, one Access-gated router.
- `compatibility_date = "2026-08-29"`, `main = "src/index.ts"`.

## Bindings (`wrangler.toml`, real ids not in `wrangler.toml.example`)
| Binding | Type | Resource |
|---|---|---|
| `VIDEOS` | R2 bucket | `x-downloader-videos` |
| `KV` | KV namespace | id `8881b4cf4a9c43ab9eba7351c09be8f7` |
| `DB` | D1 database | `x-downloader`, id `39ad612c-fad7-4fbe-b6c4-23cfbfddeed3`, `migrations_dir = "migrations"` |

## Vars (`[vars]`, not secret)
`TEAM_DOMAIN` (Zero Trust team domain), `POLICY_AUD` (Access app AUD tag), `PUBLIC_ORIGIN`
(exact Worker origin; OAuth callback = `${PUBLIC_ORIGIN}/oauth/callback`).

## Secrets (`wrangler secret put`)
`X_CLIENT_ID`, `X_CLIENT_SECRET` (X OAuth 2.0 confidential client), `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID` (both optional — `deps()` in `src/index.ts` only builds `cfg.telegram` if both
are set; alerts silently no-op otherwise).

## Routes (`src/index.ts` `handle()`)
Every route (including `/oauth/callback`) requires header `cf-access-jwt-assertion`, verified by
`verifyAccessJwt` (`src/access.ts`, ADR-0004) against `TEAM_DOMAIN`/`POLICY_AUD` — missing or
invalid JWT → 403 before any other logic runs.
- `GET /` — `renderIndex()` (`src/html.ts`) over `store.listDownloaded()` (≤500 rows, `status='downloaded'`) + `store.getStatus()`.
- `GET /v/:key` — streams a video from R2. `key` must match `VIDEO_KEY_RE` (`src/limits.ts`) or 404. Supports `Range` (206 + `Content-Range`, via `servedRange()` which normalizes all three `R2Range` shapes) and `If-None-Match` (304 on match, since R2's `onlyIf` drops the body on a matching conditional; any other `onlyIf` mismatch is 412). Malformed `%`-escapes in the key 404 instead of throwing.
- `GET /status` — JSON `Status` (`src/store.ts`) plus `pausedUntil`, `userId`.
- `GET /oauth/start` — generates PKCE verifier/challenge + `state`, stores verifier in KV (`pkce:<state>`, 600s TTL), 302 to X's authorize URL (`X_SCOPES = "bookmark.read tweet.read users.read offline.access"`).
- `GET /oauth/callback` — exchanges `code`+PKCE verifier for tokens (`exchangeCode`), stores tokens (KV `oauth`), fetches and stores the X user id (KV `userId`), clears any pause, sets `status.auth = "ok"`, 302 to `/`.
- `GET /backfill` — `sync(deps, { backfill: true })`: up to `BACKFILL_MAX_REQUESTS=10` pages of `BACKFILL_PAGE_SIZE=90`, stops at `BACKFILL_MAX_ITEMS=800` (X only returns the 800 most recent bookmarks) or when `next_token` is absent.
- Any other path or non-GET method → 404 / 405.

## `sync()` flow (`src/sync.ts`)
1. If `pausedUntil > now`, return `{skipped: "paused"}` (no API call at all).
2. `ensureAccessToken()` — reuse the cached access token if it has >`REFRESH_AHEAD_MS` (5 min) left; otherwise refresh, trying the current refresh token then `prevRefresh` as a one-shot fallback (refresh tokens are single-use and rotate — see comment in `src/sync.ts`). No usable token/user id → `needsReauth()` (pause 24h, alert once, `auth: "needs_reauth"`).
3. Page loop (1 page cron / ≤10 pages backfill): `fetchBookmarks` → `parseBookmarks` (`src/x.ts`) → for each `Item`, `processItem()`:
   - No video media → upsert `status="no_video"` and stop.
   - Has video variants: for each variant already in R2 (`store.r2.head`, the download ledger per ADR-0003), count its bytes and skip re-downloading. Otherwise, if the run's download budget (`MAX_DOWNLOADS_PER_RUN=5`) isn't spent, download it (`fetch` → check `Content-Length` ≤ `MAX_FILE_BYTES` 200MB → stream to `R2.put`, buffering unknown-length bodies up to `BUFFER_IF_NO_LENGTH_BYTES` 100MB → jittered sleep `DOWNLOAD_JITTER_MS` 1–2s between downloads).
   - A permanently-failed row (`status="failed"`, error not `http_5xx`) is never retried.
   - D1 upsert (`store.upsertBookmark`, `ON CONFLICT` never downgrades a `downloaded` row) records every bookmark seen, video or not — this is the searchable index (ADR-0007); R2 stays the download truth.
4. On an `XApiError` (`src/x.ts`), `breaker()` folds any bytes downloaded this run into `status.totalBytes` first (so a mid-run failure doesn't lose byte accounting), then: 401 with both refresh attempts dead → `needsReauth`; 429 → pause until `rateLimitReset` (or +15min) + alert `api_429`; 403 → pause 24h + alert `api_403`; 5xx items are recorded `pending` per-item and the run continues.
5. On success: updates `status` (`lastRun`, `auth: "ok"`, `totalBytes`, `counts`), clears `needs_reauth`/`api_403`/`api_429` alerts, and alerts (once, KV-tracked) on `STORAGE_ALERT_BYTES` (9GB) exceeded or `STALE_PARSER_RUNS` (30 consecutive runs with results but zero media, possible parser drift).

## KV keys (`src/store.ts`)
`oauth` (Tokens JSON), `userId`, `status` (`Status` JSON), `paused_until` (epoch ms string),
`pkce:<state>` (verifier, 600s TTL).

## D1 schema (`migrations/0001_bookmarks.sql`, table `bookmarks`)
`post_id` (PK), `first_seen_at`, `posted_at`, `text`, `post_url`, `has_video`, `status`
(`no_video`|`pending`|`downloaded`|`failed`), `error`, `r2_key`, `bytes`, `preview_url`,
`updated_at`. Upsert is idempotent and monotonic: a row already `downloaded` never reverts its
`status`/`error`, and `has_video` only ever goes 0→1.

## R2 key scheme
Key = `VIDEO_KEY_RE` = `/^\d{5,25}(-\d{1,2})?\.mp4$/` — the numeric X media id, `-1`/`-2` suffix
for multi-video posts. `customMetadata` on each object: `postId`, `text`, `postUrl`, `postedAt`,
`previewUrl`, `bitRate` (all stringified; `null` → `""`).

## Test doubles (`test/fakes.ts`)
`FakeKV`, `FakeR2` (mirrors real R2: `range` always populated on `get`, `onlyIf` support),
`FakeD1` (backed by `node:sqlite`, real SQL against `SCHEMA` loaded from the migration file),
`fakeFetch` (scripted `[url, init]` call log), `makeSigner` (WebCrypto RS256 keypair + JWT signer
for Access tests), `fixture()` (loads `test/fixtures/*.json`).

## Related ADRs
0002 (official X API), 0003 (R2 key as download ledger), 0004 (Access-gated route, no public
bucket), 0005 (hard caps + circuit breaker as code constants), 0006 (TypeScript/wrangler/`node
--test`, `#src/*` imports), 0007 (D1 indexes every bookmark), 0008 (single Worker, no queue).
