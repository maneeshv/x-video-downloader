Updated: 2026-08-30

## Now
- **Log out button** on the library, watch and `/stats` pages — links to Cloudflare Access's `/cdn-cgi/access/logout` (edge-handled, no Worker route). Branch `feat/library-ui-logout-button`, merged with `main` as of `1927615`; 57/57 tests, typecheck ok. **Not deployed, PR not opened.**
- **`/stats` observability page merged to `main`** (PR #7, 2026-08-30) — tiles, health table, failures by reason, pending + failed lists with per-row Retry (`POST /api/videos/:id/retry`) and a "Run backfill now" link. ADR-0013. **Deploy status unknown to this branch** — check `docs/JOURNAL.md` on `main` / the live site before assuming it is live.
- **Serving on `https://xrender.uk`** (Custom Domain, ADR-0012; deployed 2026-08-30, version `3fc29825-fde6-4f4e-92ab-c120497d7942`). Access covers it with the unchanged AUD; `x-downloader.x-downloader.workers.dev` is off (404). X app callback updated and re-consented 2026-08-30 17:55:46Z; cron ran on it, `auth: ok`. Merged via PR #6.
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Merged via PR #5.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed: 54 no_video, 148 downloaded, ~52 failed (mostly `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo); `storage` alert fired once. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- Work continues on short-lived branches + PRs; CI (`check`) gates them.

## Next
1. Owner: open + merge PR `feat/library-ui-logout-button` → `main`; confirm `check` is green. Then `npx wrangler deploy` (ADR-0010: manual; no migration) — this also ships `/stats` if it is not live yet. After deploy, click **Log out** once and confirm the Access login page appears.
2. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the Delete button. `/stats` "Stored" reflects deletes; KV `status.totalBytes` (and the 9 GB alert) still does not decrease on delete — one-line fix in the `DELETE` route if the alert should track trimming.
3. Owner (via `https://xrender.uk/stats`): look at the ~52 `too_large` posts and decide raise-the-cap vs accept; Retry only helps them if `MAX_FILE_BYTES` changes.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-30 Log out link on both library pages (merged with `main`; 57 tests).
- 2026-08-30 `/stats` page + Retry endpoint (ADR-0013); 52 → 56 tests; merged via PR #7.
- 2026-08-30 Custom domain `xrender.uk` live (version `3fc29825`), workers.dev off, ADR-0012; wrangler-sandbox GOTCHAS line retired.
- 2026-08-30 Paseo worktree bootstrap (`.worktreeinclude`, `paseo.json`, copy script); library UI merged (PR #5).
- 2026-08-30 Video library UI deployed (version `82c1c5c3`), migration `0002` applied, verified in-browser; ADR-0011; 43 → 52 tests.
