# x-downloader — system design
Date: 2026-08-29 | Status: **PROPOSED** (awaiting owner review; see `docs/QUESTIONS.md`)
Evidence: `docs/research/2026-08-29-persona-*.md` (five persona reports with sources)

## 1. Summary
A single Cloudflare Worker, triggered by cron, reads the owner's X bookmarks through the same internal GraphQL endpoint the X web app uses (authenticated with the owner's session cookies stored as Worker secrets), finds video posts not yet in R2, streams each mp4 into R2, and exposes a private, Cloudflare-Access-protected page to watch or download them. **No headless browser. No database. No queue.** Everything runs on free tiers; storage beyond 10 GB is the only expected cost.

The brainstorm converged on this from five angles (Cloudflare architect, scraping pragmatist, lazy senior dev, security reviewer, repo designer). Where personas disagreed, the resolution and reason are recorded in §7.

## 2. Approaches considered
| # | Approach | Cost | Reliability | Verdict |
|---|---|---|---|---|
| A | **Cookie + internal GraphQL from a Worker** (recommended) | $0 | Good; breaks on queryId rotation (self-heals, see §5) and cookie death (runbook) | **Recommended** — pending spike S1 (does X accept Cloudflare egress IPs?) |
| B | Official X API v2, pay-per-use ($0.001/bookmark read, deduped daily) | ~$1–3/mo | Best; ToS-compliant; 800-item cap | **Fallback** if S1 fails or the owner prefers ToS compliance. Needs an OAuth app + card on file. Same Worker, different fetch module. |
| C | Headless browser (Browser Run) logging into X | Free 10 min/day is too little at 30-min polling; Paid ≈ $6/mo | Worst: login blocks, 2FA/email challenges, bot flags; ends with the same cookies as A | Rejected |
| D | Browser extension → Worker webhook | $0 | Zero ban risk, but only works while the owner's browser is open | Rejected (violates "fully cloud") |
| E | Run the poller at home, Worker only stores | $0 | Residential IP removes the biggest unknown | Rejected (violates "fully cloud"); documented as escape hatch |

## 3. Architecture (approach A)
```
                    cron (*/30)                     Cloudflare Access (email OTP)
                        │                                    │
                        ▼                                    ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Worker  (src/index.ts)                                          │
   │  scheduled()  ── sync():                                          │
   │     1. GET x.com/i/api/graphql/<id>/Bookmarks (1 page, count 20)  │
   │     2. extract {tweetId, bestMp4Url, meta} for video entries      │
   │     3. for each: if !R2.head(key) → fetch(mp4) → R2.put(key, body)│
   │     4. write run summary to KV (last_run, last_error, counts)     │
   │  fetch():                                                         │
   │     GET /            → HTML list of videos (R2.list + metadata)   │
   │     GET /v/:id       → stream from R2, honours Range              │
   │     GET /status      → JSON from KV                               │
   │     GET /backfill?k= → paginate all bookmarks once (manual)       │
   └───────┬───────────────────────┬──────────────────────┬────────────┘
           │                       │                      │
     Secrets:                 R2 bucket               KV namespace
     X_AUTH_TOKEN             key = <tweetId>.mp4     run status,
     X_CT0                    customMetadata:         paused_until,
     (TELEGRAM_* optional)    author, text, url,      queryId cache,
                              bookmarkedAt            failed-id skip set
```
External calls: `x.com/i/api/graphql/*/Bookmarks` (authenticated), `video.twimg.com/*.mp4` (anonymous, verified 2026-08-29), optionally `abs.twimg.com/…/main.*.js` for queryId re-discovery and `api.telegram.org` for alerts.

## 4. Components
**Worker (TypeScript, wrangler, no framework).** Files: `src/index.ts` (handlers + routing), `src/x.ts` (headers, GraphQL call, response parser), `src/store.ts` (R2/KV helpers), `src/limits.ts` (all hard-coded caps and magic strings with provenance comments). Target ≤400 lines total.

**Cron trigger** `*/30 * * * *` (default; see Q4). One page of 20 bookmarks per run; process every item on the page (do not stop at the first already-seen id — a failed item in the middle would otherwise never retry).

**R2 bucket = storage and ledger.** Object key `<tweetId>.mp4` (multi-video tweets: `<tweetId>-<n>.mp4`). "Processed?" = `head(key)`. `put` is atomic, so a crash mid-upload leaves nothing and the next run retries. Metadata (author handle, text, tweet URL, bookmark time, bitrate) in `customMetadata`. No public bucket; no r2.dev; no custom domain on the bucket.

**KV namespace = small mutable state.** `status` (last run time, last error, counts), `paused_until` (set on 401/403/429; sync skips while set), `queryId` (cached discovery), `failed:<id>` (permanent failures such as tombstones, to skip). Writes ≤ ~50/day, well under the 1,000/day free cap.

**Secrets.** `X_AUTH_TOKEN`, `X_CT0` via `wrangler secret put`; locally in `.dev.vars`. Optional `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `BACKFILL_KEY`.

**Access.** Cloudflare Access one-click on the Worker (free, email one-time-PIN). The Worker also verifies `cf-access-jwt-assertion` so a route misconfiguration cannot expose videos. `/status` may be exempted for uptime checks (Q3).

## 5. Behaviour details
- **Headers** exactly as the web client: `Cookie: auth_token=…; ct0=…`, `x-csrf-token`, public bearer, `x-twitter-auth-type: OAuth2Session`, `x-twitter-active-user: yes`, browser User-Agent. Sequential requests, 1–3 s jitter between mp4 downloads, never parallel.
- **Video selection**: max `bitrate` among `video/mp4` variants; GIFs (`animated_gif`) included; quoted-tweet video taken from `quoted_status_result`; m3u8 ignored.
- **Streaming**: `fetch(mp4)` → `R2.put(key, response.body, {httpMetadata, customMetadata})`. Requires `Content-Length` (verified present on video.twimg.com; if absent, buffer if < 100 MB else skip and record). Skip files > 200 MB (constant).
- **Self-healing on API drift**: 404 on the GraphQL op → re-discover `queryId` (fa0311 GraphQL.md raw file, fallback main.js regex), cache in KV, retry once. 400 "features cannot be null: a, b" → add the named features as `true`, retry once. 200 with zero parsable entries on a non-empty account → treat as error and alert (this is the real drift detector).
- **Circuit breaker**: on 401 / error 32 (dead cookie) or 403 / error 326 (account lock) or 429 → set `paused_until` (24 h; 429 uses `x-rate-limit-reset`), record error, alert once, skip runs until cleared. Hard caps: `MAX_API_REQUESTS_PER_RUN = 3`, `MAX_DOWNLOADS_PER_RUN = 5`, `MAX_FILE_BYTES = 200 MB`, `MAX_TOTAL_BYTES` (owner-set, Q6).
- **Alerting**: one Telegram message per distinct failure (bot API = one `fetch`), suppressed until the failure clears. If the owner declines Telegram (Q3), `/status` and the index page show the error; nothing else.
- **Backfill**: `GET /backfill?k=<BACKFILL_KEY>` paginates all bookmarks once with the same per-item code path; resumable by construction (ledger). Wall-clock limit 15 min; re-invoke to continue. Default: run once after first deploy (Q4b).
- **Consumption**: `GET /` lists newest first with `<video controls preload="none" poster=<X thumbnail>>`; `GET /v/:id` streams with Range support. Bulk: `rclone sync` against R2's S3 API (runbook).

## 6. Security & hygiene (from the security review)
Cookies are password-equivalent; anyone who can deploy the Worker can read them. Mitigations: 2FA on X and Cloudflare; API tokens scoped to Workers Scripts Edit + R2 Object Read/Write; optional dedicated X account (Q1); rotate on suspicion (password change kills all sessions). Repo: `.dev.vars`, `.env*`, `.wrangler/`, real `wrangler.toml` gitignored; `wrangler.toml.example` committed; one helper builds auth headers; tests assert logs never contain the token; gitleaks rule for `auth_token=[0-9a-f]{40}`. R2 bucket lock (indefinite retention) so agent-written code cannot delete the archive. Cloudflare budget alert + in-code storage cap.

## 7. Disagreements resolved
| Topic | Personas | Resolution |
|---|---|---|
| D1 + Workflows (CF architect) vs R2-as-ledger + next-cron-as-retry (lazy dev) | — | **R2-as-ledger.** One user, ≤20 items/run, atomic put. Workflows/Queues/D1 stay NEVER until a concrete failure demands them. KV added only for status/pause/skip-set, which R2 cannot express cheaply. |
| Cadence hourly (lazy) vs 15–30 min (scraper) | — | **30 min default**, owner may pick (Q4). 48 GraphQL calls/day is invisible against a ~500/15 min limit. |
| Telegram alert: defer (lazy) vs include (scraper, security) | — | **Include, optional.** Fully-cloud means nobody is looking at a page; one `fetch` is cheaper than a missed month of outages. |
| Stop at first seen id (scraper) vs process whole page | — | **Whole page**, else a mid-page failure is never retried. |
| Public R2 domain (CF architect) vs Access-gated Worker route (security) | — | **Access-gated Worker route.** Unguessable URLs are not auth, and re-hosting publicly is the one legally uncomfortable thing. |

## 8. Cost
$0/month on Workers Free, R2 Free (10 GB), KV Free, Access Free. Storage over 10 GB: $0.015/GB-month (e.g., 100 videos/month × 30 MB ≈ $0.40/month by month 12). **If** streaming a large mp4 exceeds the Free plan's 10 ms CPU cap (spike S2), Workers Paid at $5/month is the fix (Q5).

## 9. Spikes before implementation (throwaway code, answers only)
- **S1 — Egress acceptance.** Throwaway Worker: one Bookmarks GraphQL call with the owner's cookies from Workers; record status, rate-limit headers, whether `x-client-transaction-id` is required, and whether X shows a "verify it's you" prompt afterwards. Failure → switch to approach B.
- **S2 — Streaming under Free CPU cap.** Throwaway Worker: stream a ~100–300 MB mp4 from video.twimg.com into R2; check for Error 1102 and confirm `Content-Length`. Failure → Workers Paid or buffer-and-chunk.

## 10. Testing
`node --test`, stdlib only. (1) `parseBookmarks(fixture)` on a scrubbed real response → expected `{id, mp4Url, meta}` list; (2) `selectVariant` cases: mp4 vs m3u8, GIF bitrate 0, multi-video, quoted video; (3) `buildHeaders` never leaks the token into any logged object; (4) circuit-breaker state transitions on 401/403/429. Manual: deploy, bookmark one video, wait ≤30 min, confirm it appears at `/`.

## 11. Out of scope for v1
D1, Queues, Workflows, Durable Objects, thumbnails, transcoding, search, multi-user, dashboard SPA, automatic login, images/text archiving. Each has a trigger condition in `docs/research/2026-08-29-persona-lazy-skeptic.md`.

## 12. Decisions that become ADRs on approval
0002 no headless browser — cookie + internal GraphQL · 0003 R2 object key is the ledger (no DB/queue) · 0004 Access-gated Worker route, no public bucket · 0005 hard caps and circuit breaker as code constants · 0006 TypeScript + wrangler, no framework, `node --test`.
