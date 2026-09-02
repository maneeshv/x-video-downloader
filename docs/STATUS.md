Updated: 2026-09-02

## Now
- **Branch `fix/library-sort-by-size` adds Library size sorting:** the existing Sort by control now offers Largest and Smallest, backed by D1's stored `bytes`; rows with unknown sizes stay last. All 72 tests, both TypeScript projects, and the session check pass; the branch is pushed for review and not deployed.
- **Branch `raise-max-file-limit-5gb` raises the immutable ceiling to 5 GiB ([ADR-0017](decisions/0017-raise-file-size-ceiling-to-5-gib.md)):** `/stats` permits 1–5120 MB and derives its maximum from `MAX_FILE_BYTES`; API, KV, and downloader validation share the same constant. All 72 tests pass and both TypeScript projects typecheck; the branch is pending review and not deployed.
- **Current `main` `1b5b45d` is live as Cloudflare Worker version `56b51492-6ad3-46b1-90ac-7bf6ee1b0996` (2026-09-02T02:25:10Z):** library pagination/state restoration/modern UI (ADR-0016), owner-adjustable 1–3072 MB file limit (ADR-0015), Retry All, step-rearming storage alerts, totalBytes-on-delete, and watch-page Download all shipped together. Both TypeScript projects and all 69 tests passed before deploy.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Review, commit, merge, and deploy `raise-max-file-limit-5gb`; then save the desired operating limit on `/stats` and explicitly retry/backfill old `too_large` rows.
2. Verify a 50/page library round trip from low on page 2; also verify Download and Log out once.
3. Confirm the first post-deploy cron run advances `/status`; expect one `storage:33GB` Telegram message from the newly deployed step-rearming alert.
4. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting the stale workers.dev origin.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Library sorting by largest/smallest file size implemented and verified on `fix/library-sort-by-size`; not deployed.
- 2026-09-02 File-size ceiling raised locally from 3 GiB to 5 GiB; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 Targeted D1 pending recovery implemented on `fix/pending-drain`; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 `main` `1b5b45d` deployed as version `56b51492`; custom-domain and old-route smoke checks pass.
- 2026-09-02 Library pagination, URL-backed watch return, responsive modern UI, tests, and browser QA completed and merged in PR #21.
