Updated: 2026-08-30

## Now
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Grid with search/favourites/sort at `/`, watch page with title/description/favourite/delete at `/watch/:id` (spec `2026-08-30-video-library-design.md`, ADR-0011). Verified in-browser: grid, search, save, favourite, playback; delete exercised only in tests. Code is on branch `library-ui` (pushed), **not yet merged** — 52/52 tests, typecheck ok.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed (X's list exhausted, under the 800 cap): 54 no_video, 148 downloaded, ~52 failed (mostly `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo overage); `storage` alert fired once 12:00:37 UTC. Real-account videos average ~98 MB. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- **v1 merged to `main`** (PR #1, 2026-08-30); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. Owner: open + merge PR `backfill-downloads` → `main` (PR #2; already deployed), then PR `library-ui` → `main` (base it on `backfill-downloads` until #2 merges); confirm `check` is green (agent cannot see Actions on the private repo).
2. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the new Delete button. Note: `status.totalBytes` does not decrease on delete (out of the v2 spec; one-line fix in the `DELETE` route if the alert/`/status` should track trimming).
3. Agent: pull the exact `failed` breakdown from D1 (`wrangler` is logged in again) and decide with the owner whether the ~52 `too_large` posts matter (raise the cap again vs accept).
4. Next session: delete the wrangler-sandbox line from `docs/GOTCHAS.md` (baked into `docs/runbooks/agent-setup.md` step 5 on 2026-08-30).

## Blocked
- Nothing agent-side. (`wrangler` re-authorized 2026-08-30 via headless login + Paseo consent.)

## Done recently (last 5; older in JOURNAL)
- 2026-08-30 Video library UI deployed (version `82c1c5c3`), migration `0002` applied, verified in-browser; docs/ADR-0011; 43 → 52 tests.
- 2026-08-30 Full backfill of the real account: 7 × `/backfill?downloads=30` + confirmation; 253 indexed, 148 downloaded, 14.56 GB. Storage alert delivered.
- 2026-08-30 Owner authorized the real X account; first cron run indexed 20 / downloaded 5 (722 MB), 0 failed.
- 2026-08-30 GitHub Actions `check` workflow (typecheck + tests on PRs); ADR-0010 amended.
- 2026-08-30 Owner confirmed playback. ADR-0010 (manual deploy, no CI), README rewritten for v1, `.env.example` added.
