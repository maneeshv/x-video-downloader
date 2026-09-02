# Architecture (as built)

Updated: 2026-09-02

Single Cloudflare Worker, `x-downloader`, deployed on the Custom Domain `https://xrender.uk` (ADR-0012; workers.dev off since 2026-08-30)
(ADR-0008: one Worker, no queue — fetch and download happen in the same cron run). Access uses the
Cloudflare identity provider; the Worker derives owner/viewer authorization from the verified email
(ADR-0019). Production admission remains account-members-only until the guarded rollout recorded in
`docs/STATUS.md`. X OAuth 2.0 and Telegram alerts are configured. Deploys are manual `wrangler deploy`; CI runs typecheck + tests
(ADR-0010). The library UI supports search/filter/sort, per-video title, description, favourite, and
delete (ADR-0011); since 2026-09-02 it also uses URL-backed pagination and restores the originating
card after a watch-page round trip (ADR-0016).
Posters are copied from X into the existing private R2 bucket and served through the authenticated
Worker, so library rendering no longer depends on X's CDN (ADR-0018).

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
(exact Worker origin; OAuth callback = `${PUBLIC_ORIGIN}/oauth/callback`), `OWNER_EMAIL` (verified
Cloudflare Login email that receives owner capabilities; missing/blank matches nobody).

## Secrets (`wrangler secret put`)
`X_CLIENT_ID`, `X_CLIENT_SECRET` (X OAuth 2.0 confidential client), `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID` (both optional — `deps()` in `src/index.ts` only builds `cfg.telegram` if both
are set; alerts silently no-op otherwise).

## Routes (`src/index.ts` `handle()`)
Every route (including `/oauth/callback`) requires header `cf-access-jwt-assertion`, verified by
`verifyAccessJwt` (`src/access.ts`, ADR-0004) against `TEAM_DOMAIN`/`POLICY_AUD` — missing or
invalid JWT or a missing/blank signed email → 403 before any other logic runs. `handle()` trims and
case-folds that verified email and `OWNER_EMAIL`. The owner retains all routes; every other admitted
email may only use `GET /`, `GET /watch/:postId`, `GET /v/:key` (including Range), and
`GET /p/:postId`. Every other
current or future route returns 403 before KV, D1, R2, or X work. This positive allowlist is required
because `/oauth/start`, `/oauth/callback`, and `/backfill` are state-changing or billable GETs.
All HTML pages (`/`, `/watch/:id`, `/stats`) carry a "Log out" link to `/cdn-cgi/access/logout`; Cloudflare answers that path at the edge (clears the Access cookie for this hostname and revokes the session across all Access apps — there is no per-app logout), so it never reaches the Worker and has no route here. Source: https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/ (read 2026-08-30).
- `GET /?q=&fav=1&sort=newest|oldest|title|largest|smallest&page=N&perPage=10|20|30|50` — parses a canonical `LibraryQuery` (default page/page-size = 1/10; invalid values fall back; an out-of-range page clamps to the last page), gets the matching total from `store.countLibrary()`, then calls `store.listLibrary(query, perPage, offset)` (`status='downloaded' AND deleted_at IS NULL`, `LIKE` over title/description/text, safe sort allow-list, `LIMIT`/`OFFSET`) and `renderIndex()`. Cards show date, stored file size, and X's `duration_ms` formatted as `m:ss`/`h:mm:ss`; missing durations are explicit. Size sorts use the stored `bytes` value and place rows with an unknown size last. Search/favourite/sort/page-size changes reset to page 1; page links and cards retain active state (ADR-0016). Viewers see `View only` and no Stats or Re-authorize links.
- `GET /watch/:postId` — `renderWatch()` over `store.getBookmark(postId)`. Library query fields carried on the watch URL are validated through the same parser; Back to library reconstructs the originating URL with `#video-<postId>` so the card returns to view, and delete returns to the same page without the now-missing anchor (ADR-0016). The header also carries a "Download" link: `<a href="/v/<r2_key>" download="<postId>.mp4">` — same URL the player streams, saved via the native `download` attribute (same-origin, so no `Content-Disposition` header is needed; MDN, read 2026-08-31). Owners receive the metadata form and mutation script; viewers receive an escaped static description and no mutation controls or script. `postId` must match `POST_ID_RE` (`src/limits.ts`); 404 unless the row is `status='downloaded'`, `deleted_at` unset, and `r2_key` set.
- `POST /api/videos/:postId` — body JSON `{title?, description?, favorite?}`. 415 unless `content-type` starts with `application/json` (no CSRF token needed: a cross-site `<form>` cannot set this header); 400 on an unparsable body, a body naming no known field, or a wrongly-typed field; 413 when `title` exceeds `TITLE_MAX`=200 or `description` exceeds `DESCRIPTION_MAX`=2000; 404 when `store.updateMeta` matches no `downloaded`, non-deleted row; 204 on success.
- `DELETE /api/videos/:postId` — 404 unless the row is `status='downloaded'`; otherwise `store.deleteVideos(postId)` (one R2 delete of `<id>.mp4`, `<id>-1..4.mp4`, and `posters/<id>`) then `store.markDeleted(postId, now)`, in that order (ADR-0011: no tombstone for media still in R2), then subtracts the row's video `bytes` from KV `status.totalBytes` (clamped at 0, only when `deleted_at` was null before this call), then 204. Idempotent: a repeat delete on an already-`downloaded` row (R2 delete of already-missing keys is a no-op) still 204s and does not subtract again.
- `GET /v/:key` — streams a video from R2. `key` must match `VIDEO_KEY_RE` (`src/limits.ts`) or 404. Supports `Range` (206 + `Content-Range`, via `servedRange()` which normalizes all three `R2Range` shapes) and conditional revalidation: 304 when the request carried If-None-Match or If-Modified-Since and R2 dropped the body; 412 otherwise; 416 only when the request carried a Range header and R2 rejected it (any other `getVideo` throw propagates instead of being reported as a client-facing 416). Malformed `%`-escapes in the key 404 instead of throwing. A deleted video's key is simply gone from R2, so this 404s naturally.
- `GET /p/:postId` — serves `posters/<postId>` from private R2 after the same Access check as every other route. Invalid IDs 404 without an R2 read. Stored images preserve R2 HTTP metadata and return `ETag`, `Content-Length`, `nosniff`, and `private, max-age=31536000, immutable`; conditional requests can return 304. A missing object returns the application-owned SVG placeholder with 200 and `no-store`; R2 failures remain server errors. The request path never redirects to or fetches from X (ADR-0018).
- `GET /stats` — `renderStats()` (`src/html.ts`, ADR-0013/0015/0017) over `store.stats()` (one `GROUP BY status, error, deleted_at IS NOT NULL` aggregate with `COUNT(*)` and `SUM(bytes)`), `store.listByStatus(["pending","failed"])` (≤500 rows, `updated_at DESC`), `store.getStatus()`, `store.getPausedUntil()`, and `store.getMaxFileBytes()`. Tiles (downloaded / pending / failed / no video / deleted / stored bytes — all from D1; KV `totalBytes` also tracks deletes since 2026-08-31), an integer-MB file-limit editor, health table (last run, auth, last error, pause, last-run counts, active alerts), failures by `error`, and the pending + failed post lists (failed rows also show `bytes` as a Size column — blank for rows that failed before 2026-08-31, which have `bytes = NULL` until retried) with a Retry button per row, a "Retry all failed (n)" button above the failed list, and a "Run backfill now" link to `/backfill?downloads=30`.
- `POST /api/settings/max-file-bytes` — JSON-only `{maxFileBytes}` with an integer byte value from `MIN_FILE_BYTES` (1 MiB) through the immutable `MAX_FILE_BYTES` ceiling (5 GiB); invalid content type → 415, invalid body/range → 400, KV `max_file_bytes` write → 204. It neither retries rows nor starts sync work (ADR-0017).
- `POST /api/videos/:postId/retry` — 415 unless `content-type` starts with `application/json` (same CSRF reasoning as `POST /api/videos/:postId`); `store.retry(postId, now)` sets `status='pending', error=NULL` on a `failed` row → 204, or 404 when the row is not `failed`. Nothing is downloaded in the request: the next sync selects the pending ID directly from D1 and rehydrates its media from X before bookmark pagination. Any other method → 405.
- `POST /api/videos/retry-all` — matched before the `:postId` pattern (which would read `retry-all` as an id → 404); same 415/405 rules; `store.retryAll(now)` runs one `UPDATE … WHERE status='failed'` and returns `{ retried: n }` as JSON. Backs the "Retry all failed (n)" button on `/stats` (shown only when n > 0). Not scoped by reason.
- `GET /status` — JSON `Status` (`src/store.ts`) plus `pausedUntil`, `userId`.
- `GET /oauth/start` — generates PKCE verifier/challenge + `state`, stores verifier in KV (`pkce:<state>`, 600s TTL), 302 to X's authorize URL (`X_SCOPES = "bookmark.read tweet.read users.read offline.access"`).
- `GET /oauth/callback` — exchanges `code`+PKCE verifier for tokens (`exchangeCode`), stores tokens (KV `oauth`), fetches and stores the X user id (KV `userId`), clears any pause, sets `status.auth = "ok"`, 302 to `/`.
- `GET /backfill` — normally `sync(deps, { backfill: true })`: up to `BACKFILL_MAX_REQUESTS=10` pages of `BACKFILL_PAGE_SIZE=90`, stopping at `BACKFILL_MAX_ITEMS=800` or when `next_token` is absent. `?downloads=N` raises the per-call video-download cap (default `MAX_DOWNLOADS_PER_RUN`=5, ceiling `BACKFILL_MAX_DOWNLOADS`=30). Explicit `?durations=1` instead selects up to 800 downloaded, non-deleted D1 rows with `duration_ms IS NULL`, looks up their post IDs in `TWEET_LOOKUP_BATCH_SIZE=100` batches, and updates only durations matching each row's playable `r2_key`; it never scans bookmarks or downloads media. Poster-only mode is `/backfill?posters=N&after=<postId>`: `N` is clamped to 1–30, `after` is an optional validated keyset cursor, and the next downloaded, non-deleted D1 rows with a source `preview_url` are repaired without querying X bookmarks. Its JSON counts stored/existing/unavailable/failed posters and returns `nextAfter`; mixing `posters` and `downloads` is rejected.
- Any other method on `/api/videos/:id` → 405. Any other non-GET method elsewhere, or any other path → 405 / 404.

## `sync()` flow (`src/sync.ts`)
1. If `pausedUntil > now`, return `{skipped: "paused"}` (no API call at all). Otherwise read `store.getMaxFileBytes()` once; that value is the whole run's stable file-size snapshot. Missing or invalid KV state safely defaults to 1 GiB.
2. `ensureAccessToken()` — reuse the cached access token if it has >`REFRESH_AHEAD_MS` (5 min) left; otherwise refresh, trying the current refresh token then `prevRefresh` as a one-shot fallback (refresh tokens are single-use and rotate — see comment in `src/sync.ts`). No usable token/user id → `needsReauth()` (pause 24h, alert once, `auth: "needs_reauth"`).
3. Explicit duration repair branches here: select eligible rows, batch `GET /2/tweets?ids=...` at 100 IDs, match parsed video keys to D1 `r2_key`, update only non-null durations, then return without bookmark or R2 work. Otherwise, pending drain selects up to the same 100-ID limit of oldest `pending` D1 post IDs, fetches their current media metadata, and passes returned items through the same `processItem()` and shared download budget. X may omit deleted/protected/unavailable posts; those rows remain pending rather than being guessed terminal. Then run the page loop (1 page cron / ≤10 pages backfill): `fetchBookmarks` → `parseBookmarks` (`src/x.ts`, including each media item's `duration_ms`) → for each `Item`, `processItem()`; items already handled by the pending drain are not processed twice:
   - A row with `deleted_at` set is skipped before any R2 call (ADR-0011) — the owner's delete is permanent; the cron never resurrects a tombstoned video.
   - No video media → upsert `status="no_video"` and stop.
   - Has video variants: for each variant already in R2 (`store.r2.head`, the download ledger per ADR-0003), count its bytes and skip re-downloading. Otherwise, if the run's download budget (`MAX_DOWNLOADS_PER_RUN=5`) isn't spent, download it (`fetch` → a missing/zero `Content-Length` is refused outright (`no_length`, body never read) → check `Content-Length` ≤ the run's owner-selected limit (1 GiB default, immutable 5 GiB code ceiling) → stream to `R2.put` → jittered sleep `DOWNLOAD_JITTER_MS` 1–2s between downloads).
   - A row with a permanent error is never retried unless the error is transient (`http_5xx`): this covers an outright `status="failed"` row and a multi-video post's partial row (below).
   - Multi-video posts: if some but not all of a post's videos end up in R2 and the rest can never succeed (a permanent per-video failure, e.g. `http_404`), the row is still recorded `status="downloaded"` (with the failing video's `error`) rather than left `pending`/`failed` — so the stored sibling isn't hidden from `listLibrary()`.
   - Once a non-deleted post has at least one video in R2, `ensurePoster()` checks the deterministic poster key and, when absent, streams a valid `https://pbs.twimg.com` JPEG/PNG/WebP of known size ≤5 MiB into R2. It rejects credentials, custom ports, redirects, unknown/zero length, other hosts/types, and oversize bodies. Poster failure is logged without the source URL and never changes the video's state; downloaded rows with a permanent sibling error remain poster-eligible (ADR-0018).
   - D1 upsert (`store.upsertBookmark`, `ON CONFLICT` never downgrades a `downloaded` row) records every bookmark seen, video or not — this is the searchable index (ADR-0007); R2 stays the download truth.
4. On an `XApiError` (`src/x.ts`) thrown by the pending lookup, bookmarks-page fetch, or a token refresh, `breaker()` folds any bytes downloaded this run into `status.totalBytes` first (so a mid-run failure doesn't lose byte accounting), then dispatches on `e.status`: 401 → one forced token refresh attempt, and if both refresh tokens are dead, `needsReauth()` (pause 24h, alert once, `auth: "needs_reauth"`); 429 → pause until `x-rate-limit-reset` (or +15min if absent) + alert `api_429`; 403 → pause 24h + alert `api_403`; any other status (5xx) → no pause, just `lastRun`/`lastError` recorded, and the run ends for this tick (picked up again next scheduled run). This is separate from the per-video mp4 download outcomes inside step 3's `processItem()`/`download()`, which never throw `XApiError` and never reach `breaker()`: a 5xx or thrown exception on the mp4 fetch itself is recorded `pending` (retried later) and a 4xx/`too_large`/`no_variants` is `failed` (not retried), per-video, while the run continues to the next item.
5. On success: updates `status` (`lastRun`, `auth: "ok"`, `totalBytes`, `counts`), clears `needs_reauth`/`api_403`/`api_429` alerts, and alerts (KV-tracked) on `STALE_PARSER_RUNS` (30 consecutive runs with results but zero media, possible parser drift; once) and on `STORAGE_ALERT_BYTES` (9 GB) exceeded — once per `STORAGE_ALERT_STEP_BYTES` (3 GiB) step crossed, keyed `storage:<step>GB`; every other `storage*` key is cleared each run, so a shrink below a step re-arms it (ADR-0005, amended 2026-08-31).

## KV keys (`src/store.ts`)
`oauth` (Tokens JSON), `userId`, `status` (`Status` JSON), `paused_until` (epoch ms string),
`max_file_bytes` (owner-selected integer byte count; 1 GiB default, valid range 1 MiB–5 GiB),
`pkce:<state>` (verifier, 600s TTL).

## D1 schema (`migrations/0001_bookmarks.sql` + `0002_library.sql` + `0003_duration.sql`, table `bookmarks`)
`post_id` (PK), `first_seen_at`, `posted_at`, `text`, `post_url`, `has_video`, `status`
(`no_video`|`pending`|`downloaded`|`failed`), `error`, `r2_key`, `bytes`, `duration_ms`, `preview_url`,
`updated_at`. Upsert is idempotent and monotonic: a row already `downloaded` never reverts its
`status`/`error`, and `has_video` only ever goes 0→1. `0002_library.sql` (2026-08-30, ADR-0011)
adds `title` (`TEXT`), `description` (`TEXT`), `favorite` (`INTEGER NOT NULL DEFAULT 0`),
`deleted_at` (`TEXT`, ISO timestamp; non-`NULL` = tombstone) — sync never writes these; only the
`/api/videos/:id` routes and `markDeleted` do. `0003_duration.sql` adds nullable `duration_ms`
(`INTEGER`); sync fills it from X metadata and keeps the value aligned with the row's playable `r2_key`.

## R2 key scheme
Key = `VIDEO_KEY_RE` = `/^\d{5,25}(-\d{1,2})?\.mp4$/` — the numeric X media id, `-1`/`-2` suffix
for multi-video posts. `customMetadata` on each object: `postId`, `text`, `postUrl`, `postedAt`,
`previewUrl`, `bitRate` (all stringified; `null` → `""`).

Poster key = `posters/<postId>`, one immutable object per post; conditional put with
`etagDoesNotMatch: "*"` prevents overlapping runs from replacing it. Its allowlisted image type is stored
as R2 HTTP metadata. The key is derived rather than stored in D1; `preview_url` remains only as the
capture/backfill source and is never rendered after the cutover. Poster bytes are deliberately
excluded from the video-only `status.totalBytes` counter (ADR-0018).

## Test doubles (`test/fakes.ts`)
`FakeKV`, `FakeR2` (mirrors real R2: `range` always populated on `get`, `onlyIf` support, `delete(keys)`),
`FakeD1` (backed by `node:sqlite`, real SQL against `SCHEMA` loaded from every `migrations/*.sql`
file in order; `run()` returns `meta.changes`),
`fakeFetch` (scripted `[url, init]` call log), `makeSigner` (WebCrypto RS256 keypair + JWT signer
for Access tests), `fixture()` (loads `test/fixtures/*.json`).

## Related ADRs
0002 (official X API), 0003 (R2 key as download ledger), 0004 (Access-gated route, no public
bucket), 0005 (hard caps + circuit breaker as code constants), 0006 (TypeScript/wrangler/`node
--test`, `#src/*` imports), 0007 (D1 indexes every bookmark), 0008 (single Worker, no queue),
0009 (refuse unknown-length video bodies instead of buffering), 0011 (library metadata in D1;
delete tombstone overrides the R2 ledger), 0012 (Custom Domain `xrender.uk`, workers.dev off), 0013 (`/stats` page over D1; retry resets a row to pending), 0014 (Claude Code hooks gate every Stop against the session protocol — tooling, not runtime), 0015 (owner-adjustable file-size operating limit), 0016 (URL-backed library pagination and return position), 0017 (5 GiB immutable file-size ceiling), 0018 (private durable posters in R2 under deterministic keys), 0019 (exact-email viewers and Worker owner authorization).
