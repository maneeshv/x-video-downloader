# x-downloader — system design
Date: 2026-08-29 (revised same day after owner answers Q1=c, Q5=yes, defaults for Q2–Q8) | Status: **PROPOSED — revision awaiting owner review**
Evidence: `docs/research/2026-08-29-persona-*.md`, `docs/research/2026-08-29-x-api-v2.md` · Decisions: ADR-0002…0006

## 1. Summary
A single Cloudflare Worker, triggered by cron every 30 minutes, reads the owner's bookmarks through the **official X API v2** (OAuth 2.0 user context, pay-per-use), finds video posts not yet in R2, streams each mp4 into R2, and exposes a private, Cloudflare-Access-protected page to watch or download them. **No headless browser, no session cookies, no database, no queue.** Compute and storage run on free tiers; the X API costs ≈ $0.70/month (≤ $3.50 worst case); storage beyond 10 GB is the only other cost.

## 2. Approaches considered (decided in ADR-0002)
| # | Approach | Cost | Verdict |
|---|---|---|---|
| A | Session cookies + X's internal GraphQL from a Worker | $0 | Rejected by owner: stores a password-equivalent secret, violates X ToS, unverified whether X tolerates Cloudflare egress IPs |
| **B** | **Official X API v2, pay-per-use** | ~$0.70–3.50/mo | **Chosen.** ToS-compliant, documented, stable; needs an X developer app + prepaid credits |
| C | Headless browser login (Browser Run) | ≥ $5/mo | Rejected: login challenges, bot flags, ends with the same cookies as A |
| D | Browser extension → webhook | $0 | Rejected: not fully cloud |
| E | Poller at home, Worker stores | $0 | Rejected: not fully cloud |

## 3. Architecture
```
   cron */30 ──────────────┐            Cloudflare Access (email OTP) ── owner's browser
                           ▼                                   │
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ Worker (src/index.ts)                                                    │
   │ scheduled() → sync():                                                    │
   │   0. if KV.paused_until > now → skip                                     │
   │   1. token = ensureAccessToken()   (refresh if < 5 min left; rotate safely)│
   │   2. GET api.x.com/2/users/{id}/bookmarks?max_results=20&expansions=…     │
   │   3. extract {postId, bestMp4Url, meta} for entries with video media      │
   │   4. for each (≤5/run): if !R2.head(key) → fetch(mp4) → R2.put(key, body) │
   │   5. KV.status = {lastRun, lastError, counts, bytes}                     │
   │ fetch():                                                                 │
   │   GET /                → HTML index (R2.list + customMetadata)           │
   │   GET /v/:id           → stream from R2, honours Range                   │
   │   GET /status          → JSON from KV                                    │
   │   GET /oauth/start     → redirect to x.com authorize (PKCE, state in KV) │
   │   GET /oauth/callback  → exchange code, store tokens + user id in KV     │
   │   GET /backfill        → paginate all bookmarks once (≤800), same path    │
   └────────┬──────────────────────────┬──────────────────────┬───────────────┘
            │                          │                      │
      Secrets                     R2 bucket               KV namespace
      X_CLIENT_ID                 key <postId>.mp4        oauth {access, refresh,
      X_CLIENT_SECRET             customMetadata:           prevRefresh, expiresAt}
      TELEGRAM_BOT_TOKEN (opt)      text, postUrl,         userId, status,
      TELEGRAM_CHAT_ID  (opt)       createdAt, bitrate,    paused_until,
                                    previewUrl            pkce:<state>, failed:<id>
```
External calls: `api.x.com/2/*` (OAuth bearer), `x.com/i/oauth2/authorize` (browser redirect), `video.twimg.com/*.mp4` (anonymous; `Accept-Ranges` + `Content-Length` verified), `api.telegram.org` (optional alerts).

## 4. Components
**Worker** — TypeScript, wrangler, no framework (ADR-0006). Files: `src/index.ts` (handlers, routing, HTML), `src/x.ts` (OAuth + bookmarks call + parser), `src/store.ts` (R2/KV helpers), `src/limits.ts` (caps + magic strings with provenance comments). Target ≤ 450 lines.

**Cron** `*/30 * * * *`. One request of `max_results=20` per run; process every returned item (never stop at the first already-seen id — a mid-page failure would never retry).

**R2 = storage + ledger** (ADR-0003). Key `<postId>.mp4`, multi-video `<postId>-<n>.mp4`. Processed ⇔ `head(key)` exists. `put` is atomic. Metadata in `customMetadata`. Never public (ADR-0004).

**KV = small mutable state.** `oauth` (access token, refresh token, previous refresh token, expiry), `userId`, `status`, `paused_until`, `pkce:<state>` (10-minute TTL during consent), `failed:<id>` (permanent skips: no variants, tombstoned, >200 MB). Writes ≈ 50–100/day, under the 1,000/day free cap.

**Secrets** via `wrangler secret put`: `X_CLIENT_ID`, `X_CLIENT_SECRET`, optional `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Locally `.dev.vars` (gitignored). `wrangler.toml.example` committed; real `wrangler.toml` gitignored.

**Access.** Cloudflare Access one-click on the Worker; every route including `/oauth/*` and `/backfill` sits behind it (the OAuth callback is a browser redirect carrying the owner's Access cookie). The Worker additionally validates `cf-access-jwt-assertion` (team domain + AUD from vars) so a misconfigured policy cannot expose videos or trigger backfills.

## 5. Behaviour
- **OAuth.** `/oauth/start`: generate `code_verifier`/S256 challenge + random `state`, store in KV, redirect to `https://x.com/i/oauth2/authorize` with `scope=bookmark.read tweet.read users.read offline.access`. `/oauth/callback`: verify state, POST `https://api.x.com/2/oauth2/token` with `Authorization: Basic base64(client_id:client_secret)` + `code_verifier`; store tokens; call `GET /2/users/me` once and cache `userId`; clear `paused_until`.
- **Token refresh (rotation-safe).** If `expiresAt − now < 5 min`: POST refresh → **write the new token pair to KV first**, keeping the old refresh token as `prevRefresh`. If refresh fails with the current token, try `prevRefresh` once. If both fail → set `status.auth = needs_reauth`, pause, alert once with the `/oauth/start` link. (Refresh tokens are single-use and invalidated server-side immediately — `docs/research/2026-08-29-x-api-v2.md`.)
- **Bookmarks request.** `expansions=attachments.media_keys&media.fields=media_key,type,variants,preview_image_url,duration_ms&tweet.fields=created_at,text,attachments`. No `author_id`/`user.fields` (may bill as $0.01 user reads; post URL is `https://x.com/i/status/<id>`, which needs no handle).
- **Video selection.** From `includes.media`, `type ∈ {video, animated_gif}`, choose max `bit_rate` among `content_type == video/mp4`. No variants → `failed:<id>` + log. Quoted-post video is out of v1 scope (needs an extra $0.005 lookup); recorded as a follow-up.
- **Download.** `fetch(mp4)` → `R2.put(key, response.body, {httpMetadata: {contentType}, customMetadata})`. Requires `Content-Length` (verified exposed); if absent and `< 100 MB`, buffer; else skip + `failed:<id>`. Skip > 200 MB. Sequential, 1–2 s jitter, max 5 downloads/run; the rest wait for the next run.
- **Circuit breaker (ADR-0005).** 401 → attempt refresh once, else `needs_reauth` + pause 24 h. 403/429 → pause until `x-rate-limit-reset` (429) or 24 h (403), alert once. Hard caps in `src/limits.ts`: `MAX_API_REQUESTS_PER_RUN=3`, `MAX_DOWNLOADS_PER_RUN=5`, `MAX_FILE_BYTES=200 MB`, `STORAGE_ALERT_BYTES=9 GB` (alert, keep downloading — owner default Q6). `200 OK` with `data` present but zero media for 30 consecutive runs while `meta.result_count > 0` → alert "parser may be stale".
- **Alerting.** Telegram Bot API, one `fetch`, one message per distinct condition, suppressed until cleared. Without Telegram secrets, `/status` and the index page are the only signal.
- **Backfill.** `GET /backfill` (behind Access) paginates with `max_results=90` (pagination bug at 100) until no `next_token` or 800 items; same per-item path; resumable by construction; 15-minute wall limit → re-invoke. Runs once after first deploy (owner default Q4b).
- **Consumption (Q2 = both).** `GET /` lists newest first: `<video controls preload="none" poster=previewUrl src="/v/<id>">`, text, post link, size, download link. `GET /v/:id` streams with `Range` support. Bulk: `rclone sync` against R2's S3 API with a scoped read-only token (runbook to be written at deploy time).

## 6. Cost
| Item | Monthly |
|---|---|
| Workers, KV, R2 ops, Access, cron | $0 (free tiers) |
| X API reads (≈23 deduped posts/day) | ≈ $0.70 at Owned-Reads rate; ≤ $3.50 at standard rate; spending limit $10/cycle |
| R2 storage over 10 GB | $0.015/GB-month |
| Workers Paid (only if streaming trips the Free 10 ms CPU cap — owner approved) | $5 |

## 7. Security & hygiene
Client secret and tokens are far lower-value than session cookies (revocable at x.com/settings/connected_apps; scoped read-only) — ADR-0002. Still: never log tokens (one helper builds auth headers; test asserts no leak); scoped Cloudflare API tokens; R2 bucket lock; Cloudflare budget alert; `.dev.vars`/`wrangler.toml` gitignored; gitleaks pre-commit.

## 8. Testing (ADR-0006)
`node --test`, stdlib only. Fixtures: one scrubbed real bookmarks response (video, animated_gif, photo-only, multi-video, no-variants). Tests: `parseBookmarks(fixture)` → expected list; `selectVariant` edge cases; `buildAuthHeader` never leaks into serialized logs; refresh-rotation state machine (success, first fails/prev succeeds, both fail → needs_reauth); circuit-breaker transitions on 401/403/429. Manual acceptance: deploy → `/oauth/start` → bookmark one video → within 30 min it appears at `/`.

## 9. Open items / follow-ups (not blocking)
- Owned-Reads rate may not yet apply to bookmarks — confirm from the first console usage report.
- `animated_gif` variants shape unverified — parser must tolerate absence.
- Quoted-post video support — later, if the owner misses it.
- Free-plan CPU cap on large streams — if Error 1102 appears, move to Workers Paid (approved).

## 10. Out of scope for v1
D1, Queues, Workflows, Durable Objects, thumbnails generation, transcoding, search, multi-user, SPA dashboard, images/text archiving, quoted-post video.
