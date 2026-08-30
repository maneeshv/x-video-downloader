Updated: 2026-08-30

## Now
- **Serving on `https://xrender.uk`** (Custom Domain, ADR-0012; deployed 2026-08-30, version `3fc29825-fde6-4f4e-92ab-c120497d7942`). Access covers it with the unchanged AUD (verified 302). `x-downloader.x-downloader.workers.dev` is off (404). X app callback updated by the owner (2026-08-30); X renders the consent page for `redirect_uri=https://xrender.uk/oauth/callback`. **One fresh `/oauth/start` approval still pending** — owner step, see Next 1. Branch `assess-xrender-uk-custom-domain`, not yet merged.
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Grid with search/favourites/sort at `/`, watch page with title/description/favourite/delete at `/watch/:id` (spec `2026-08-30-video-library-design.md`, ADR-0011). Verified in-browser: grid, search, save, favourite, playback; delete exercised only in tests. Merged to `main` via PR #5 (2026-08-30) — 52/52 tests, typecheck ok.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed (X's list exhausted, under the 800 cap): 54 no_video, 148 downloaded, ~52 failed (mostly `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo overage); `storage` alert fired once 12:00:37 UTC. Real-account videos average ~98 MB. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- **v1 merged to `main`** (PR #1, 2026-08-30); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. **Owner:** open `https://xrender.uk/oauth/start` in a browser logged in to X and approve (proves the new callback end-to-end; the cron does not depend on it). Agent then confirms the KV `oauth` blob changed (pre-flow sha256 prefix `606137fa`) and `/status` `auth: ok`. Then open + merge PR `assess-xrender-uk-custom-domain` → `main`.
2. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the new Delete button. Note: `status.totalBytes` does not decrease on delete (out of the v2 spec; one-line fix in the `DELETE` route if the alert/`/status` should track trimming).
3. Agent: pull the exact `failed` breakdown from D1 (`wrangler` is logged in again) and decide with the owner whether the ~52 `too_large` posts matter (raise the cap again vs accept).

## Blocked
- Nothing agent-side. (`wrangler` re-authorized 2026-08-30 via headless login + Paseo consent.)

## Done recently (last 5; older in JOURNAL)
- 2026-08-30 Custom domain `xrender.uk` live (version `3fc29825`), workers.dev off, ADR-0012; wrangler-sandbox GOTCHAS line retired.
- 2026-08-30 Video library UI deployed (version `82c1c5c3`), migration `0002` applied, verified in-browser; docs/ADR-0011; 43 → 52 tests.
- 2026-08-30 Full backfill of the real account: 7 × `/backfill?downloads=30` + confirmation; 253 indexed, 148 downloaded, 14.56 GB. Storage alert delivered.
- 2026-08-30 Owner authorized the real X account; first cron run indexed 20 / downloaded 5 (722 MB), 0 failed.
- 2026-08-30 GitHub Actions `check` workflow (typecheck + tests on PRs); ADR-0010 amended.
