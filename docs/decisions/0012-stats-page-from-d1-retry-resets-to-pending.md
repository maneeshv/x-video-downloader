# 0012. Observability is a server-rendered `/stats` page over D1; "retry" only resets a row to pending
Date: 2026-08-30 | Status: DECIDED (owner: "build it, and add a Retry button") | Supersedes: — | Evidence: `src/store.ts` `stats()`/`retry()`, `src/sync.ts` `processItem()`

## Context
The owner could not see what was pending, downloaded, failed or why: the only view was `/status` (raw KV JSON of the *last run*), and D1 held per-post state nobody rendered. Candidates: an external dashboard (Cloudflare Analytics Engine / Grafana — a new dependency and account plumbing for ~250 rows), a JSON-only endpoint (the owner would still be reading JSON), or one more server-rendered page like the library. For "retry", candidates were an immediate in-request re-download (a 100 MB fetch inside a click, racing the cron and the download budget) or a status reset that the existing sync loop honours.

## Decision
`GET /stats` (`renderStats`, `src/html.ts`) renders one `GROUP BY status, error, deleted_at IS NOT NULL` query (`Store.stats()`) plus the pending/failed rows (`Store.listByStatus()`) and the KV `status` blob. Counts and stored bytes come from D1, not `status.totalBytes` — so the "Stored" tile drops when a video is deleted (KV `totalBytes` never does). No charts: nothing is time-series yet. `POST /api/videos/:id/retry` runs `Store.retry()`: `failed → pending`, `error = NULL`; nothing is fetched in the request. `processItem()` already re-attempts pending rows the next time a sync sees the post — the cron only rescans the newest page, so the page links `/backfill?downloads=30` beside it.

## Consequences
- easier: zero dependencies, one page, same Access gate; deleting videos now shows up in "Stored"; a retry is a 1-row UPDATE that cannot race a download.
- harder: a retried `too_large` post fails again unless `MAX_FILE_BYTES` changes (the page says so); a retry on an old bookmark waits for the next `/backfill`; no history (counts over time) — that needs a snapshot table and an ADR.
- revisit when: the owner wants trends (write a daily snapshot row from the cron), or the failed list outgrows one page (~500 rows; add paging).
