Updated: 2026-09-02

## Now
- **Branch `feat/library-video-duration` is live as Worker version `3c22564d-6e55-454f-a4f1-6b6517546eee`:** production D1 migration `0003_duration.sql` is applied, X `duration_ms` persists in D1, and Library cards format it beside file size as `m:ss`/`h:mm:ss`. The authenticated Paseo `/backfill` run saw 83 items with 0 failures and no redownloads; duration coverage is now 65/198 downloaded rows. Production browser verification shows formatted durations on 9 of the first 10 cards; the remaining card has an existing permanent partial-download error. Both TypeScript projects and all 74 tests pass.
- **The deployed feature branch contains current `origin/main` `b664765`:** production therefore also has the merged 5 GiB file-size ceiling and Library largest/smallest sorting.
- **Rollback target:** Worker version `96b4147b-4bb7-4796-91ed-c644c76855c2`, which was at 100% before this deployment. The custom domain still redirects unauthenticated requests to Access and the old workers.dev route remains disabled (404).
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Push, review, and merge `feat/library-video-duration`; production is already running this exact feature commit plus the documentation-only deployment record.
2. Decide whether the 133 older rows that X no longer returns need a separate R2/MP4 metadata extraction path; the normal X backfill cannot populate them.
3. Save the desired operating file limit on `/stats` and explicitly retry/backfill old `too_large` rows if the merged 5 GiB ceiling is newly deployed.
4. Verify a 50/page library round trip from low on page 2; also verify Download and Log out once.
5. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting the stale workers.dev origin.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Library duration data flow deployed as `3c22564d`; migration applied and Paseo backfill/browser verification completed.
- 2026-09-02 Library sorting by largest/smallest file size implemented and verified on `fix/library-sort-by-size`; not deployed.
- 2026-09-02 File-size ceiling raised locally from 3 GiB to 5 GiB; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 Targeted D1 pending recovery implemented on `fix/pending-drain`; 72 tests and both TypeScript projects pass; not deployed.
- 2026-09-02 `main` `1b5b45d` deployed as version `56b51492`; custom-domain and old-route smoke checks pass.
