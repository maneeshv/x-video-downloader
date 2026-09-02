Updated: 2026-09-02

## Now
- **Branch `feat/library-video-duration` shows duration beside file size:** X already returns `duration_ms`; migration `0003_duration.sql` persists it in D1 and Library cards format it as `m:ss`/`h:mm:ss`. Both TypeScript projects and all 74 tests pass; not merged, migrated remotely, deployed, or backfilled.
- **Current `origin/main` `b664765` includes the merged 5 GiB file-size ceiling and Library largest/smallest sorting:** production deployment is not recorded in this repo yet.
- **Last recorded production source `1b5b45d` is live as Cloudflare Worker version `56b51492-6ad3-46b1-90ac-7bf6ee1b0996` (2026-09-02T02:25:10Z):** library pagination/state restoration/modern UI (ADR-0016), owner-adjustable 1–3072 MB file limit (ADR-0015), Retry All, step-rearming storage alerts, totalBytes-on-delete, and watch-page Download all shipped together. Both TypeScript projects and all 69 tests passed before deploy.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Review and merge `feat/library-video-duration`; before deploying it, apply pending D1 migrations so `0003_duration.sql` lands before code reads `duration_ms`.
2. Deploy current `main`, run one `/backfill` to populate duration for existing Library rows, and verify a card shows duration beside size.
3. Save the desired operating file limit on `/stats` and explicitly retry/backfill old `too_large` rows if the merged 5 GiB ceiling is newly deployed.
4. Verify a 50/page library round trip from low on page 2; also verify Download and Log out once.
5. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting the stale workers.dev origin.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Library duration data flow and card display implemented and verified on `feat/library-video-duration`; not deployed.
- 2026-09-02 Library sorting by largest/smallest file size implemented and verified on `fix/library-sort-by-size`; not deployed.
- 2026-09-02 File-size ceiling raised locally from 3 GiB to 5 GiB; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 Targeted D1 pending recovery implemented on `fix/pending-drain`; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 `main` `1b5b45d` deployed as version `56b51492`; custom-domain and old-route smoke checks pass.
