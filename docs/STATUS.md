Updated: 2026-09-02

## Now
- **Branch `fix/library-duration-sort` adds Longest/Shortest Library sorting on `duration_ms`** (unknown durations last, post ID tie-breaks), mirroring the file-size sort. All 75 tests and both TypeScript projects pass. Committed on top of `origin/main` `94055d4`; not pushed, merged, or deployed.
- **PR #27 (`fix/library-duration-unavailable`) is merged into `main` `94055d4`** and its code is what production runs as Worker version `36bc3020-0d82-4549-9293-8fe3917ddad8`: `GET /backfill?durations=1` repaired 116 of 133 missing durations; production D1 has 181/198 live downloaded rows with duration and 17 unavailable. Production also has the 5 GiB file-size ceiling and Library largest/smallest sorting.
- **Rollback target:** Worker version `3c22564d-6e55-454f-a4f1-6b6517546eee`, which was at 100% before this deployment. The custom domain still redirects unauthenticated requests to Access and the old workers.dev route remains disabled (404).
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Push, review, merge, and deploy `fix/library-duration-sort` (Longest/Shortest Library sorting).
2. Decide whether the 17 rows still unavailable from X justify a separate R2/MP4 metadata extraction path.
3. Save the desired operating file limit on `/stats` and explicitly retry/backfill old `too_large` rows if the merged 5 GiB ceiling is newly deployed.
4. Verify a 50/page library round trip from low on page 2; also verify Download and Log out once.
5. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting the stale workers.dev origin.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Longest/Shortest Library duration sorting implemented on `fix/library-duration-sort`; 75 tests pass; not pushed.
- 2026-09-02 Duration repair deployed and run: 181/198 live Library rows now have duration; 17 remain unavailable. PR #27 merged.
- 2026-09-02 Library duration data flow deployed as `3c22564d`; migration applied and Paseo backfill/browser verification completed.
- 2026-09-02 Library sorting by largest/smallest file size implemented and verified on `fix/library-sort-by-size`; not deployed.
- 2026-09-02 File-size ceiling raised locally from 3 GiB to 5 GiB; 72 tests and both TypeScript projects pass; not deployed.
