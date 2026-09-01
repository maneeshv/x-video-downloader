Updated: 2026-08-31

## Now
- **Download link** on the watch page — `<a href="/v/<r2_key>" download="<postId>.mp4">` pill next to Log out; native attribute, no route change (MDN: same-origin suffices). PR #18 merged to `main` 2026-08-31 as `6e941c2`; 62/62 tests. **Not deployed** — live is still `eb02b42`; #15, #16, #17 and #18 all wait for one deploy.
- **Storage alert re-arms per 3 GiB step** — PR #16 merged to `main` 2026-08-31 as `bd785d7` (not deployed): `storage:<step>GB` keys (`STORAGE_ALERT_STEP_BYTES`) replace the one-shot `alerts.storage`, every other `storage*` key is cleared each run, so PR #15's decrease-on-delete re-arms it with no extra code. The first post-deploy run will send one `storage:33GB` message for the current 35.91 GB — expected.
- **Live = `main` `eb02b42`** (deployed 2026-08-31 as version `3e4ea5ba-00d3-4ca7-92bf-47814c3b3030`; trigger `xrender.uk (custom domain)`, workers.dev 404): `/stats` failed list has a **Size column** and `too_large` failures now record the refused `Content-Length` in `bookmarks.bytes` (PR #13). Verified through Access. The 8 rows that failed before this deploy show a blank Size until retried.
- **Retry all failed — PR #17 merged to `main` as `716e2e4` on 2026-08-31 (not deployed):** `/stats` gets a **Retry all failed (n)** button → `POST /api/videos/retry-all` → `Store.retryAll()` (one `UPDATE … WHERE status='failed'`, returns `{ retried: n }`). Replaces N clicks / the raw SQL line in `reset-store.md`. ADR-0013 amended. Rebased on `main` `7be8eeb` (PR #15 merged 2026-08-31, not yet deployed — live is still `eb02b42`). 60 tests.
- **Session-protocol hooks (ADR-0014) are on `main`**: `.claude/settings.json` + `.claude/hooks/session-protocol.sh` block a turn from ending if code changed without JOURNAL/STATUS or a Bash command failed without a gotcha check. Active in every session started after 2026-08-31 (hooks load at session start).
- **Real account state (read from `/stats` 2026-08-31):** 190 downloaded / 0 pending / 8 failed (all `too_large`, i.e. > 1 GB) / 56 no video / 1 deleted / **35.91 GB in R2** (≈ 26 GB over the 10 GB free tier ≈ $0.39/mo). The owner already retried the 52 `too_large` rows after the 1 GB cap; 44 downloaded. Cron every 30 min, `auth: ok`, last run 2026-08-31T07:30:26Z; the 9 GB `storage` alert fired once (2026-08-30) and will not re-fire until `feat/storage-alert-rearm` is merged and deployed.
- Serving on `https://xrender.uk` (ADR-0012) behind Access; Log out button live (PR #8); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. Owner: say "deploy" once (ADR-0010) from an up-to-date `main` (`6e941c2`; no migration) — ships #15 (totalBytes on delete) + #16 (alert re-arm) + #17 (Retry all) + #18 (Download link). Run the deploy runbook "Before every deploy" `wrangler.toml` diff first. Expect one `storage:33GB` Telegram message on the first cron run after deploy (35.91 GB, re-arm working as designed). Afterwards click **Download** on a watch page (expect a `<postId>.mp4` save prompt) and **Log out** once (expect the Access login page). `gh` here is the work account (GOTCHAS): `gh auth login` as `maneeshv` + `gh auth switch -u maneeshv` would let agents open PRs. `gh` here is the work account (GOTCHAS): `gh auth login` as `maneeshv` + `gh auth switch -u maneeshv` would let agents open PRs.
2. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` (`[[routes]]`, `PUBLIC_ORIGIN = https://xrender.uk`). The drift has now tripped **three** worktrees (2026-08-30, 2026-08-31 ×2); the pre-check catches it but only the source fix ends it. Merge the docs PR from `docs/deploy-stats-size`.
3. Owner (optional, after that deploy): click **Retry all failed** on `https://xrender.uk/stats` for the 8 remaining `too_large` rows — they will fail again (> 1 GB) but now record their size, so the Size column shows how far over the cap each is. Then decide: raise `MAX_FILE_BYTES` again (ADR-0005 amendment) or leave them.
4. Owner: R2 is at 35.91 GB. Trim with the Delete button if the ≈ $0.39/mo matters; KV `status.totalBytes` decreases on delete since PR #15 (merged 2026-08-31 as `7be8eeb`, not yet deployed); the alert re-arms below a step since PR #16 (same deploy) (D1 `SUM(bytes)` on `/stats` is the truth either way).

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-31 Download link on the watch page (PR #18, merged to `main` as `6e941c2`; 62 tests). Not deployed.
- 2026-08-31 Storage alert keyed per 3 GiB step (`STORAGE_ALERT_STEP_BYTES`), ADR-0005 amended (PR #16, merged to `main` as `bd785d7`; 61 tests). Not deployed.
- 2026-08-31 "Retry all failed" button + `POST /api/videos/retry-all` (PR #17, merged to `main` as `716e2e4`; 60 tests). Not deployed.
- 2026-08-31 `DELETE /api/videos/:id` subtracts the row's bytes from KV `totalBytes` (PR #15, merged 2026-08-31 as `7be8eeb`; 58 tests). Not deployed.
- 2026-08-31 Deployed `main` `eb02b42` as `3e4ea5ba` (Size column + size recording + hooks); `wrangler.toml` drift tripped a third time, caught by the pre-check.
