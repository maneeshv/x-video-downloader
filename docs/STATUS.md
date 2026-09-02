Updated: 2026-09-02

## Now
- **Merged `main` `8e104b5` is live as Cloudflare Worker version `77bb4325-73d4-427a-a9ed-a0d6b228c466` (2026-09-02T11:01:03Z):** it includes targeted pending recovery and the 5 GiB immutable file-size ceiling ([ADR-0017](decisions/0017-raise-file-size-ceiling-to-5-gib.md)); `/stats` now permits 1–5120 MB while the saved default remains 1 GiB. Both TypeScript projects, all 72 tests, and the session-doc check passed before deploy.
- **Production read-back passes:** Wrangler reports version `77bb4325` at 100% with the `xrender.uk` custom domain and 30-minute cron; `https://xrender.uk/status` returns the expected Access redirect (`302`) and the old workers.dev route returns `404`.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Verify `/stats` shows the 5120 MB ceiling; if desired, save a higher operating limit and explicitly Retry/Backfill old `too_large` rows.
2. Confirm the first post-deploy cron run advances `/status` and directly attempts old pending IDs.
3. Verify a 50/page library round trip from low on page 2; also verify Download and Log out once.
4. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting the stale workers.dev origin.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Merged `main` `8e104b5` deployed as version `77bb4325`; production version and edge smoke checks pass.
- 2026-09-02 PR #24 merged: file-size ceiling raised from 3 GiB to 5 GiB with a constant-derived `/stats` maximum.
- 2026-09-02 Targeted D1 pending recovery implemented on `fix/pending-drain`; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 `main` `1b5b45d` deployed as version `56b51492`; custom-domain and old-route smoke checks pass.
- 2026-09-02 Library pagination, URL-backed watch return, responsive modern UI, tests, and browser QA completed and merged in PR #21.
