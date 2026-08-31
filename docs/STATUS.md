Updated: 2026-08-31

## Now
- **Storage alert re-arms per 3 GiB step** (branch `feat/storage-alert-rearm`, PR open 2026-08-31, not deployed): `storage:<step>GB` keys replace the one-shot `alerts.storage`; the first post-deploy run will send one `storage:12GB` message for the current ~14.5 GB. Sibling branches in flight the same day: `fix/totalbytes-on-delete` (KV `totalBytes` decreases on delete — the alert re-arms on its own once that lands), retry-all on `/stats`, download link on `/watch`.
- **Log out button** on the library, watch and `/stats` pages — links to Cloudflare Access's `/cdn-cgi/access/logout` (edge-handled, no Worker route). Merged via PR #8 (2026-08-30); 57/57 tests, typecheck ok. **Not deployed yet** — the live version (`8943f06c`) predates it.
- **`/stats` observability page live** at `https://xrender.uk/stats` (deployed 2026-08-30, version `8943f06c-adcc-4830-b4f0-28b77dfe027f`; merged to `main` via PR #7): tiles (downloaded / pending / failed / no video / deleted / stored), health table, failures by reason, pending + failed post lists with a per-row Retry (`POST /api/videos/:id/retry`, failed → pending) and a "Run backfill now" link. ADR-0013. Verified through Access: 148 / 0 / 52 (`too_large`) / 54 / 0 / 13.56 GB. A first deploy with a stale worktree `wrangler.toml` (version `15143be0`) briefly re-enabled workers.dev; fixed by the redeploy — see deploy runbook "Before every deploy".
- **Serving on `https://xrender.uk`** (Custom Domain, ADR-0012; first deployed 2026-08-30 as version `3fc29825`). Access covers it with the unchanged AUD; `x-downloader.x-downloader.workers.dev` is off (404). X app callback updated and re-consented 2026-08-30 17:55:46Z; cron runs on it, `auth: ok`. Merged via PR #6.
- **Video library UI live** (deployed 2026-08-30, version `82c1c5c3-3e6a-4a47-9f12-521023391187`; migration `0002_library.sql` applied). Merged via PR #5.
- **Real X account fully backfilled (2026-08-30).** 253 bookmarks indexed: 54 no_video, 148 downloaded, 52 failed (all `too_large` > 350 MB). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo); `storage` alert fired once. Cron (every 30 min, 5 downloads/tick) handles new bookmarks; `auth: ok`.
- Work continues on short-lived branches + PRs; CI (`check`) gates them.

## Next
1. Owner: merge the docs-only follow-up PR from `feat/analytics-dashboard-ui` (deploy record + runbook pre-check; PR #7 merged before it was written).
2. Owner: `npx wrangler deploy` from an up-to-date `main` checkout (ADR-0010: manual; no migration) to ship the Log out button — run the deploy runbook's "Before every deploy" `wrangler.toml` diff first. After deploy, click **Log out** once and confirm the Access login page appears.
3. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim with the Delete button. `/stats` "Stored" reflects deletes; KV `status.totalBytes` decreasing on delete is on `fix/totalbytes-on-delete` (2026-08-31).
4. Owner (via `https://xrender.uk/stats`): look at the 52 `too_large` posts and decide raise-the-cap vs accept; Retry only helps them if `MAX_FILE_BYTES` changes.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-08-31 Storage alert keyed per 3 GiB step (`STORAGE_ALERT_STEP_BYTES`), ADR-0005 amended; 58 tests. PR open, not deployed.
- 2026-08-30 Log out link on library/watch/stats pages (PR #8; 57 tests). Not yet deployed.
- 2026-08-30 `/stats` page + Retry endpoint deployed (version `8943f06c`, ADR-0013, PR #7); 52 → 56 tests; worktree `wrangler.toml` drift caught and baked into the deploy runbook.
- 2026-08-30 Custom domain `xrender.uk` live (version `3fc29825`), workers.dev off, ADR-0012; wrangler-sandbox GOTCHAS line retired.
- 2026-08-30 Paseo worktree bootstrap (`.worktreeinclude`, `paseo.json`, copy script); library UI merged (PR #5).
