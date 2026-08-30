Updated: 2026-08-30

## Now
- **Log out button** added to both library pages (`/` and `/watch/:id`) — links to Cloudflare Access's `/cdn-cgi/access/logout`. On branch `feat/library-ui-logout-button`, 53/53 tests, typecheck ok. **Not deployed, PR not opened.**
- **Video library UI merged to `main`** (PR #5, 2026-08-30) and live since 2026-08-30 (version `82c1c5c3-3e6a-4a47-9f12-521023391187`, migration `0002_library.sql` applied). Grid with search/favourites/sort at `/`, watch page with title/description/favourite/delete at `/watch/:id` (spec `2026-08-30-video-library-design.md`, ADR-0011). Delete exercised only in tests.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed (X's list exhausted, under the 800 cap): 54 no_video, 148 downloaded, ~52 failed (mostly `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo overage); `storage` alert fired once 12:00:37 UTC. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- Work continues on short-lived branches + PRs; CI (`check`) gates them.

## Next
1. Owner: open + merge PR `feat/library-ui-logout-button` → `main`, then approve `wrangler deploy` (ADR-0010: manual deploy). After deploy, click **Log out** once and confirm the Access login page appears.
2. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the Delete button. Note: `status.totalBytes` does not decrease on delete (out of the v2 spec; one-line fix in the `DELETE` route if the alert/`/status` should track trimming).
3. Agent: pull the exact `failed` breakdown from D1 and decide with the owner whether the ~52 `too_large` posts matter (raise the cap again vs accept).

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-30 Log out link on both library pages (53 tests); wrangler-sandbox GOTCHAS line retired (lives in `agent-setup.md` step 5).
- 2026-08-30 Paseo worktree bootstrap (`.worktreeinclude`, `paseo.json`, copy script); library UI merged (PR #5).
- 2026-08-30 Video library UI deployed (version `82c1c5c3`), migration `0002` applied, verified in-browser; docs/ADR-0011; 43 → 52 tests.
- 2026-08-30 Full backfill of the real account: 7 × `/backfill?downloads=30` + confirmation; 253 indexed, 148 downloaded, 14.56 GB. Storage alert delivered.
- 2026-08-30 Owner authorized the real X account; first cron run indexed 20 / downloaded 5 (722 MB), 0 failed.
