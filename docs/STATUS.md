Updated: 2026-08-31

## Now
- **Live = `main` `eb02b42`** (deployed 2026-08-31 as version `3e4ea5ba-00d3-4ca7-92bf-47814c3b3030`; trigger `xrender.uk (custom domain)`, workers.dev 404): `/stats` failed list has a **Size column** and `too_large` failures now record the refused `Content-Length` in `bookmarks.bytes` (PR #13). Verified through Access. The 8 rows that failed before this deploy show a blank Size until retried.
- **Branch `feat/stats-retry-all` (pushed; PR NOT opened — `gh` is logged in as the work account and cannot see this private repo, see GOTCHAS; not deployed):** `/stats` gets a **Retry all failed (n)** button → `POST /api/videos/retry-all` → `Store.retryAll()` (one `UPDATE … WHERE status='failed'`, returns `{ retried: n }`). Replaces N clicks / the raw SQL line in `reset-store.md`. ADR-0013 amended. 59 tests.
- **Session-protocol hooks (ADR-0014) are on `main`**: `.claude/settings.json` + `.claude/hooks/session-protocol.sh` block a turn from ending if code changed without JOURNAL/STATUS or a Bash command failed without a gotcha check. Active in every session started after 2026-08-31 (hooks load at session start).
- **Real account state (read from `/stats` 2026-08-31):** 190 downloaded / 0 pending / 8 failed (all `too_large`, i.e. > 1 GB) / 56 no video / 1 deleted / **35.91 GB in R2** (≈ 26 GB over the 10 GB free tier ≈ $0.39/mo). The owner already retried the 52 `too_large` rows after the 1 GB cap; 44 downloaded. Cron every 30 min, `auth: ok`, last run 2026-08-31T07:30:26Z; the 9 GB `storage` alert fired once (2026-08-30) and will not re-fire.
- Serving on `https://xrender.uk` (ADR-0012) behind Access; Log out button live (PR #8); work continues on short-lived branches + PRs, CI (`check`) gates them.

## Next
1. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` (`[[routes]]`, `PUBLIC_ORIGIN = https://xrender.uk`). The drift has now tripped **three** worktrees (2026-08-30, 2026-08-31 ×2); the pre-check catches it but only the source fix ends it. Merge the docs PR from `docs/deploy-stats-size`.
2. Owner: open the PR for `feat/stats-retry-all` from https://github.com/maneeshv/x-video-downloader/compare/main...feat/stats-retry-all?expand=1 (or `gh auth login` as `maneeshv` + `gh auth switch -u maneeshv` so agents can open PRs), merge it (and the three sibling quick-win PRs: totalBytes on delete, storage alert re-arm, `/watch` download link — expect JOURNAL/STATUS conflicts, resolve by keeping all entries), then say "deploy" (ADR-0010).
3. Owner (optional, after that deploy): click **Retry all failed** on `https://xrender.uk/stats` for the 8 remaining `too_large` rows — they will fail again (> 1 GB) but now record their size, so the Size column shows how far over the cap each is. Then decide: raise `MAX_FILE_BYTES` again (ADR-0005 amendment) or leave them.
4. Owner: R2 is at 35.91 GB. Trim with the Delete button if the ≈ $0.39/mo matters; KV `status.totalBytes` still does not decrease on delete — one-line fix in the `DELETE` route if the alert should track trimming.
5. Owner: click **Log out** once on `https://xrender.uk` and confirm the Access login page appears (still unexercised).

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-31 "Retry all failed" button + `POST /api/videos/retry-all` (branch `feat/stats-retry-all` pushed, PR needs the owner; 59 tests).
- 2026-08-31 Deployed `main` `eb02b42` as `3e4ea5ba` (Size column + size recording + hooks); `wrangler.toml` drift tripped a third time, caught by the pre-check.
- 2026-08-31 Session-protocol hooks gate every Stop (ADR-0014; `check-session.sh` takes a BASE ref).
- 2026-08-31 `/stats` failed list shows file size; `too_large` records the refused size in D1 (branch `feat/stats-failed-jobs-file-size`, 57 tests).
- 2026-08-31 Deployed `main` `a1f8f99` twice (`ddf0cb8f`, then `25913a4a` live): Log out button + 1 GB cap on xrender.uk; the `wrangler.toml` drift gotcha re-tripped in both worktrees (one deployed stale `7915346e`, corrected within 2 min; the other caught it pre-deploy).
