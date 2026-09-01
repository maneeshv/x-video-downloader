Updated: 2026-08-31

## Now
- **Download link** on the watch page — `<a href="/v/<r2_key>" download="<postId>.mp4">` pill next to Log out; native attribute, no route change (MDN: same-origin suffices). Branch `feat/watch-download-link` pushed 2026-08-31, merged with `main` `7be8eeb`; 59/59 tests. **PR not yet opened** — `gh` in the agent session is the work account (see GOTCHAS); owner opens it from the GitHub compare view. **Not deployed yet.**
- **`DELETE /api/videos/:id` subtracts the row's bytes from KV `status.totalBytes`** (clamped at 0, once per row) — PR #15 merged to `main` 2026-08-31 as `7be8eeb`. **Not deployed yet** — live is `eb02b42`.
- **Live = `main` `eb02b42`** (deployed 2026-08-31 as version `3e4ea5ba-00d3-4ca7-92bf-47814c3b3030`; trigger `xrender.uk (custom domain)`, workers.dev 404): `/stats` failed list has a **Size column** and `too_large` failures now record the refused `Content-Length` in `bookmarks.bytes` (PR #13). Verified through Access. The 8 rows that failed before this deploy show a blank Size until retried.
- **Session-protocol hooks (ADR-0014) are on `main`**: `.claude/settings.json` + `.claude/hooks/session-protocol.sh` block a turn from ending if code changed without JOURNAL/STATUS or a Bash command failed without a gotcha check. Active in every session started after 2026-08-31 (hooks load at session start).
- **Real account state (read from `/stats` 2026-08-31):** 190 downloaded / 0 pending / 8 failed (all `too_large`, i.e. > 1 GB) / 56 no video / 1 deleted / **35.91 GB in R2** (≈ 26 GB over the 10 GB free tier ≈ $0.39/mo). The owner already retried the 52 `too_large` rows after the 1 GB cap; 44 downloaded. Cron every 30 min, `auth: ok`, last run 2026-08-31T07:30:26Z; the 9 GB `storage` alert fired once (2026-08-30) and will not re-fire.
- Serving on `https://xrender.uk` (ADR-0012) behind Access; Log out button live (PR #8); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. Owner: open the PR `feat/watch-download-link` → `main` (https://github.com/maneeshv/x-video-downloader/compare/main...feat/watch-download-link?expand=1) — the agent could not (`gh` is the work account, see GOTCHAS). Sibling branches `feat/storage-alert-rearm` and `feat/stats-retry-all` are rebasing onto `main` in parallel; whichever lands second re-merges (docs conflicts only).
2. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` (`[[routes]]`, `PUBLIC_ORIGIN = https://xrender.uk`). The drift has now tripped **three** worktrees (2026-08-30, 2026-08-31 ×2); the pre-check catches it but only the source fix ends it. Merge the docs PR from `docs/deploy-stats-size`.
3. Owner: `npx wrangler deploy` from an up-to-date `main` checkout (ADR-0010: manual; no migration) to ship PR #15 (totalBytes on delete) and, once its PR is merged, the watch-page Download link — run the deploy runbook's "Before every deploy" `wrangler.toml` diff first. After deploy: click **Log out** once and confirm the Access login page appears (still unexercised), and click **Download** on a watch page and confirm a `<postId>.mp4` save prompt.
4. Owner (optional): Retry the 8 remaining `too_large` rows on `https://xrender.uk/stats` — they will fail again (> 1 GB) but now record their size, so the Size column shows how far over the cap each is. Then decide: raise `MAX_FILE_BYTES` again (ADR-0005 amendment) or leave them.
5. Owner: R2 is at 35.91 GB. Trim with the Delete button if the ≈ $0.39/mo matters; KV `status.totalBytes` (and the 9 GB alert) decreases on delete once PR #15 is deployed (D1 `SUM(bytes)` on `/stats` is the truth either way).

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-31 Download link on the watch page (branch `feat/watch-download-link`, merged with `main` `7be8eeb`; 59 tests). PR to be opened by owner; not deployed.
- 2026-08-31 PR #15 merged (`7be8eeb`): `DELETE /api/videos/:id` subtracts the row's bytes from KV `totalBytes`; 58 tests. Not deployed.
- 2026-08-31 Deployed `main` `eb02b42` as `3e4ea5ba` (Size column + size recording + hooks); `wrangler.toml` drift tripped a third time, caught by the pre-check.
- 2026-08-31 Session-protocol hooks gate every Stop (ADR-0014; `check-session.sh` takes a BASE ref).
- 2026-08-31 `/stats` failed list shows file size; `too_large` records the refused size in D1 (branch `feat/stats-failed-jobs-file-size`, 57 tests).
