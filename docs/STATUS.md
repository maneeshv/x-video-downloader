Updated: 2026-09-02

## Now
- **Current `main` `1b5b45d` is live as Cloudflare Worker version `56b51492-6ad3-46b1-90ac-7bf6ee1b0996` (2026-09-02T02:25:10Z):** library pagination/state restoration/modern UI (ADR-0016), owner-adjustable 1–3072 MB file limit (ADR-0015), Retry All, step-rearming storage alerts, totalBytes-on-delete, and watch-page Download all shipped together. Both TypeScript projects and all 69 tests passed before deploy.
- **Production edge checks pass:** Wrangler reports `56b51492` at 100%, `https://xrender.uk/status` returns the expected Access redirect (`302`), and the old workers.dev route returns `404`. The authenticated page-2 UI round trip remains a read-only follow-up because Chrome browser control timed out during this deploy session.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Verify a 50/page library round trip from low on page 2; also verify Download and Log out once.
2. Owner: if the 8 old `too_large` rows should be retried, use Retry All once to record their sizes, save a higher limit on `/stats` as needed (≤3 GiB), Retry All again, then run Backfill. Saving alone intentionally does no download work.
3. Confirm the first post-deploy cron run advances `/status`; expect one `storage:33GB` Telegram message from the newly deployed step-rearming alert.
4. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting the stale workers.dev origin.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 `main` `1b5b45d` deployed as version `56b51492`; custom-domain and old-route smoke checks pass.
- 2026-09-02 Library pagination, URL-backed watch return, responsive modern UI, tests, and browser QA completed and merged in PR #21.
- 2026-09-02 PR #20 merged: owner-adjustable `/stats` file-size limit with a 1 GiB default and immutable 3 GiB code ceiling (ADR-0015).
- 2026-08-31 Download link on the watch page merged in PR #18.
- 2026-08-31 Storage alert re-arm, Retry All, and totalBytes-on-delete merged and are now deployed.
