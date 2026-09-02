Updated: 2026-09-02

## Now
- **Library pagination + state restoration + modern UI are complete on `library-pagination-modern-ui`; [PR #21](https://github.com/maneeshv/x-video-downloader/pull/21) includes `main` `89c9f02`** — ADR-0016. Default 10 videos, choices 10/20/30/50, D1 count + limit/offset, out-of-range clamp, and URL-backed `q`/`fav`/`sort`/`page`/`perPage`. Watch links preserve that state and Back to library returns to `#video-<postId>`. PR #20's download-limit editor is retained in the refreshed stats UI. Both TypeScript projects and all 69 combined tests pass. **Not deployed.**
- **Current `main` `89c9f02` contains PRs #15–#20 but is not deployed:** totalBytes decreases on delete, storage alerts re-arm per 3 GiB step, `/stats` has Retry All plus a 1–3072 MB owner-adjustable limit (ADR-0015), and watch pages have Download. Live remains version `3e4ea5ba` from source `eb02b42` (2026-08-31), so all of those features plus PR #21 can ship in one owner-approved deploy.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Agent: push the merge resolution and confirm PR #21 is conflict-free.
2. Owner: review and merge PR #21.
3. Owner: say “deploy” under ADR-0010; run the deploy runbook's `wrangler.toml` pre-check first. Expect one `storage:33GB` Telegram message on the first cron run.
4. After deploy, verify a 50/page library round trip from low on page 2; use Retry All once to record the 8 rejected sizes, save a higher limit on `/stats` as needed (≤3 GiB), Retry All again, then run Backfill. Saving alone intentionally does no download work.
5. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example`; then verify Download and Log out once and trim R2 with Delete if the 35.91 GB overage matters.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Library pagination, URL-backed watch return, responsive modern UI, tests, and browser QA complete (not deployed).
- 2026-09-02 PR #20 merged: owner-adjustable `/stats` file-size limit with a 1 GiB default and immutable 3 GiB code ceiling (ADR-0015).
- 2026-08-31 Download link on the watch page (PR #18, merged as `6e941c2`; not deployed).
- 2026-08-31 Storage alert keyed per 3 GiB step (PR #16, merged as `bd785d7`; not deployed).
- 2026-08-31 Retry All failed on `/stats` (PR #17, merged as `716e2e4`; not deployed).
