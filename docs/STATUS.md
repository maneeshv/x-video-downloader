Updated: 2026-08-31

## Now
- **Live version `25913a4a-981e-4214-aef2-0b607c5de1aa`** (deployed 2026-08-31 from `main` `a1f8f99`): `MAX_FILE_BYTES` 350 MB → 1 GB (PR #10, ADR-0005 amended) + the Log out button (PR #8, links to Access's `/cdn-cgi/access/logout`, edge-handled). Verified: `xrender.uk/status` → 302 to Access, workers.dev → 404. The 52 `too_large` rows stay `failed` until re-queued (Next #1).
- **`/stats` observability page live** at `https://xrender.uk/stats` (deployed 2026-08-30, version `8943f06c-adcc-4830-b4f0-28b77dfe027f`; merged to `main` via PR #7): tiles (downloaded / pending / failed / no video / deleted / stored), health table, failures by reason, pending + failed post lists with a per-row Retry (`POST /api/videos/:id/retry`, failed → pending) and a "Run backfill now" link. ADR-0013. Verified through Access: 148 / 0 / 52 (`too_large`) / 54 / 0 / 13.56 GB. A first deploy with a stale worktree `wrangler.toml` (version `15143be0`) briefly re-enabled workers.dev; fixed by the redeploy — see deploy runbook "Before every deploy".
- **Serving on `https://xrender.uk`** (Custom Domain, ADR-0012; first deployed 2026-08-30 as version `3fc29825`). Access covers it with the unchanged AUD; `x-downloader.x-downloader.workers.dev` is off (404). X app callback updated and re-consented 2026-08-30 17:55:46Z; cron runs on it, `auth: ok`. Merged via PR #6.
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Merged via PR #5.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed: 54 no_video, 148 downloaded, 52 failed (all `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo); `storage` alert fired once. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- Work continues on short-lived branches + PRs; CI (`check`) gates them.

## Next
1. Owner: merge the docs PR from `docs/deploy-1gb-cap` (this deploy's record), then re-queue the 52 `too_large` rows — per-row Retry on `https://xrender.uk/stats`, or the one-liner in `docs/runbooks/reset-store.md` (`UPDATE bookmarks SET status='pending', error=NULL WHERE error='too_large'`) — then `/backfill?downloads=30` or wait for cron (5/tick). Files > 1 GB will fail `too_large` again.
2. Owner: click **Log out** once on `https://xrender.uk` and confirm the Access login page appears.
3. Owner: R2 will grow well past the 10 GB free tier once #1 runs (52 files of 350 MB–1 GB, ≈ $0.015/GB-mo); the 9 GB `storage` alert already fired and will not re-fire. Trim with the Delete button if wanted; KV `status.totalBytes` still does not decrease on delete — one-line fix in the `DELETE` route if the alert should track trimming.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-31 Deployed version `25913a4a` (1 GB cap + Log out button); stale worktree `wrangler.toml` caught by the runbook pre-check.
- 2026-08-31 `MAX_FILE_BYTES` 350 MB → 1 GB (PR #10, ADR-0005 amended; 57 tests).
- 2026-08-30 Log out link on library/watch/stats pages (PR #8; 57 tests).
- 2026-08-30 `/stats` page + Retry endpoint deployed (version `8943f06c`, ADR-0013, PR #7); 52 → 56 tests; worktree `wrangler.toml` drift caught and baked into the deploy runbook.
- 2026-08-30 Custom domain `xrender.uk` live (version `3fc29825`), workers.dev off, ADR-0012; wrangler-sandbox GOTCHAS line retired.
