# Research: minimal design (persona: lazy senior dev / YAGNI)
Date: 2026-08-29 | Source: brainstorm subagent, reasoning only (no citations — claims about X API shape and limits must be cross-checked with `2026-08-29-persona-x-scraper.md` and `2026-08-29-persona-cf-architect.md`)

## Biggest simplification
**No browser.** X's web app is a client of `https://x.com/i/api/graphql/<queryId>/Bookmarks`. A plain `fetch` with `Cookie: auth_token=…; ct0=…`, `x-csrf-token: <ct0>`, `Authorization: Bearer <public web bearer>` reproduces it. Response already contains `extended_entities.media[].video_info.variants` (mp4 URLs + bitrates) — no second request per tweet.

**R2 is the ledger.** Object key = `<tweet_id>.mp4`; `bucket.head(key)` answers "processed?". No KV/D1/cursor state.

## Minimal components
1. One Worker (`scheduled` + `fetch` handlers, ~200 lines)
2. One cron trigger
3. One R2 bucket
4. Two secrets (`X_COOKIES`, `X_CSRF`) + one const for GraphQL `queryId`
5. Cloudflare Access (free) in front of the Worker route — zero auth code

## KEEP / DEFER / NEVER
| Thing | Verdict | Trigger to add |
|---|---|---|
| Cron trigger | KEEP | — |
| R2 | KEEP | storage + ledger |
| KV | DEFER | skip-set for permanently failed ids, when logs show the same id retried every run |
| D1 | NEVER | single user, <10k rows; use R2 `customMetadata` for author/text/url |
| Queues | NEVER | ≤40 items/run; next cron is the retry queue |
| Workflows | NEVER | R2 put is atomic; nothing to orchestrate |
| Durable Objects | NEVER | overlapping crons are idempotent |
| Dashboard UI | DEFER → 30-line HTML index | never a SPA |
| Telegram/email | DEFER | index shows last run / last error; add after actually missing an outage >1 week |
| Retry system | NEVER | per-item try/catch, log, continue; next run retries |
| Metadata DB | NEVER | R2 customMetadata |
| Thumbnails | DEFER | `<video poster=X thumb URL>` |
| Transcoding | NEVER | take highest-bitrate mp4 |

## Failure & idempotency
head() before download; R2 put is all-or-nothing so a mid-upload crash leaves nothing → retried next run. Stream `fetch(mp4).body` into `put()` (needs Content-Length; fallback `arrayBuffer()` under the 128 MB Worker memory limit). Per run: first ~2 pages (~40 bookmarks). Backfill = one-off `GET /backfill` route paginating to the end, same code path, resumable by construction.

## Cadence
Hourly. 15-min buys nothing; daily risks large batches. Real risk is X disliking Cloudflare egress IPs — **test that on day one before writing anything else.**

## Consumption UX
`GET /` lists bucket → HTML with `<video controls src="/v/<id>">`; `GET /v/:id` streams from R2 honoring `Range` (seeking breaks without it). Behind Cloudflare Access. Bulk to laptop: `rclone sync` via R2's S3 API.

## Re-auth
auth_token lives months–years. On 401/403 the run fails and the index shows "auth broken since <date>". Fix: DevTools → copy cookie → `wrangler secret put`. Same drill when `queryId` rotates.

## Tooling & tests
TypeScript + wrangler, no framework. `src/index.ts` + `src/x.ts`. Tests: (1) one scrubbed real Bookmarks response as fixture, `node --test` asserting `parseBookmarks(fixture)`; (2) runtime assertion: HTTP 200 with zero parsed entries → error surfaced in status (this is what actually detects drift).

## Pushback
"Scalable" = design for 1 user. "Remember what it processed" = the bucket. Dashboard/notifications = the video page shows status. Open-source-ready = README with 3 secrets + `wrangler deploy`, not multi-tenancy. Headless browser only adds a reason to get paged.
