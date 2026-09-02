Updated: 2026-09-02

## Now
- **[PR #20](https://github.com/maneeshv/x-video-downloader/pull/20) is open** from `stats-page-max-file-bytes-control`, rebased on `main` `d9402d2`: approved [spec](superpowers/specs/2026-09-02-stats-file-size-limit-design.md), completed [plan](superpowers/plans/2026-09-02-stats-file-size-limit.md), and ADR-0015. `/stats` can save a 1–3072 MB operating limit in KV; existing deployments default to 1 GiB and code enforces an immutable 3 GiB ceiling. `npm run check` green (66 tests); no migration/dependency.
- **Current `main` contains PRs #15–#18 but is not deployed:** totalBytes decreases on delete, storage alerts re-arm per 3 GiB step, `/stats` has Retry All, and watch pages have Download. Live remains version `3e4ea5ba` from source `eb02b42` (2026-08-31), so all five features—including this branch—can ship in one later owner-approved deploy.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2. Those 8 old failures have blank sizes until retried once.

## Next
1. Owner: review and merge PR #20.
2. Owner: say “deploy” under ADR-0010 to ship current `main` plus this feature; run the deploy runbook's `wrangler.toml` pre-check first. Expect one `storage:33GB` Telegram message on the first cron run.
3. After deploy, use Retry All once to record the 8 rejected sizes, save a higher limit on `/stats` as needed (≤3 GiB), Retry All again, then run Backfill. Saving alone intentionally does no download work.
4. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-downloader/wrangler.toml` to match `wrangler.toml.example`; stale copies have tripped three worktrees.
5. After deploy, verify Download on a watch page and Log out once; trim R2 with Delete if the 35.91 GB overage matters.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Opened PR #20: owner-adjustable `/stats` file-size limit with a 1 GiB default and immutable 3 GiB code ceiling (ADR-0015; 66 tests).
- 2026-08-31 Download link on the watch page (PR #18, merged as `6e941c2`; not deployed).
- 2026-08-31 Storage alert keyed per 3 GiB step (PR #16, merged as `bd785d7`; not deployed).
- 2026-08-31 Retry All failed on `/stats` (PR #17, merged as `716e2e4`; not deployed).
- 2026-08-31 `status.totalBytes` decreases on delete (PR #15, merged as `7be8eeb`; not deployed).
