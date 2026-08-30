Updated: 2026-08-30

## Now
- **`/stats` observability page live** at `https://xrender.uk/stats` (deployed 2026-08-30, version `8943f06c-adcc-4830-b4f0-28b77dfe027f`; branch `feat/analytics-dashboard-ui`, pushed, **not yet merged**): tiles (downloaded / pending / failed / no video / deleted / stored), health table, failures by reason, pending + failed post lists with a per-row Retry (`POST /api/videos/:id/retry`, failed → pending) and a "Run backfill now" link. ADR-0013. 56/56 tests. Verified through Access: 148 / 0 / 52 (`too_large`) / 54 / 0 / 13.56 GB. A first deploy with a stale worktree `wrangler.toml` (version `15143be0`) briefly re-enabled workers.dev; fixed by the redeploy — see deploy runbook "Before every deploy".
- **Serving on `https://xrender.uk`** (Custom Domain, ADR-0012; deployed 2026-08-30, version `3fc29825-fde6-4f4e-92ab-c120497d7942`). Access covers it with the unchanged AUD; `x-downloader.x-downloader.workers.dev` is off (404). X app callback updated and re-consented by the owner 2026-08-30 17:55:46Z; cron ran on it, `auth: ok`. Merged via PR #6.
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Merged via PR #5.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed: 54 no_video, 148 downloaded, ~52 failed (mostly `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo); `storage` alert fired once. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- **v1 merged to `main`** (PR #1, 2026-08-30); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. Owner: open + merge PR `feat/analytics-dashboard-ui` → `main` (conflict-free against `main` as of `d012c44`; already deployed); confirm `check` is green.
2. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the Delete button. `/stats` "Stored" reflects deletes; KV `status.totalBytes` (and the 9 GB alert) still does not decrease on delete — one-line fix in the `DELETE` route if the alert should track trimming.
3. Owner (via `https://xrender.uk/stats`): look at the 52 `too_large` posts and decide raise-the-cap vs accept; Retry only helps them if `MAX_FILE_BYTES` changes.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-30 `/stats` page + Retry endpoint deployed (version `8943f06c`, ADR-0013); 52 → 56 tests; worktree `wrangler.toml` drift caught and baked into the deploy runbook.
- 2026-08-30 Custom domain `xrender.uk` live (version `3fc29825`), workers.dev off, ADR-0012; wrangler-sandbox GOTCHAS line retired.
- 2026-08-30 Video library UI deployed (version `82c1c5c3`), migration `0002` applied, verified in-browser; ADR-0011; 43 → 52 tests.
- 2026-08-30 Full backfill of the real account: 253 indexed, 148 downloaded, 14.56 GB. Storage alert delivered.
- 2026-08-30 Owner authorized the real X account; first cron run indexed 20 / downloaded 5 (722 MB), 0 failed.
