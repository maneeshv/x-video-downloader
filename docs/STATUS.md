Updated: 2026-08-30

## Now
- **`/stats` observability page built, not yet deployed** (branch `feat/analytics-dashboard-ui`, 2026-08-30): tiles (downloaded / pending / failed / no video / deleted / stored), health table, failures by reason, pending + failed post lists with a per-row Retry (`POST /api/videos/:id/retry`, failed → pending) and a "Run backfill now" link. ADR-0012. 56/56 tests, typecheck ok. Needs `wrangler deploy` (no migration).
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Code on branch `library-ui` (pushed), **not yet merged**.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed: 54 no_video, 148 downloaded, ~52 failed (mostly `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo); `storage` alert fired once. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- **v1 merged to `main`** (PR #1, 2026-08-30); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. Owner: merge order — PR #2 `backfill-downloads` → `library-ui` → this branch (`feat/analytics-dashboard-ui`, the `/stats` page); confirm `check` is green on each (agent cannot see Actions on the private repo). Then approve `wrangler deploy` for `/stats`.
2. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the Delete button. `/stats` "Stored" now reflects deletes; KV `status.totalBytes` (and the 9 GB alert) still does not decrease on delete — one-line fix in the `DELETE` route if the alert should track trimming.
3. Owner (via `/stats` once deployed): look at the ~52 `too_large` posts and decide raise-the-cap vs accept; Retry only helps them if `MAX_FILE_BYTES` changes.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-30 `/stats` page + Retry endpoint (ADR-0012); 52 → 56 tests; wrangler-sandbox GOTCHAS line retired.
- 2026-08-30 Video library UI deployed (version `82c1c5c3`), migration `0002` applied, verified in-browser; ADR-0011; 43 → 52 tests.
- 2026-08-30 Full backfill of the real account: 253 indexed, 148 downloaded, 14.56 GB. Storage alert delivered.
- 2026-08-30 Owner authorized the real X account; first cron run indexed 20 / downloaded 5 (722 MB), 0 failed.
- 2026-08-30 GitHub Actions `check` workflow (typecheck + tests on PRs); ADR-0010 amended.
