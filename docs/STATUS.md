Updated: 2026-09-02

## Now
- **Library pagination + state restoration + modern UI are complete on `library-pagination-modern-ui`** — approved spec/plan: `docs/superpowers/specs/2026-09-02-library-pagination-modern-ui-design.md` and `docs/superpowers/plans/2026-09-02-library-pagination-modern-ui.md`; ADR-0015. Default 10 videos, choices 10/20/30/50, D1 count + limit/offset, out-of-range clamp, and URL-backed `q`/`fav`/`sort`/`page`/`perPage`. Watch links carry that state; Back to library returns to `#video-<postId>`. Library/watch/stats share the refreshed responsive dark UI. 65 tests + typecheck green; desktop, 390px mobile, 50-item mode, and page-2/card return visually verified locally with no console errors. **Not deployed.**
- **`origin/main` = `d9402d2`** (PRs #15–#19 merged); the 2026-08-31 STATUS deployment facts remain unchanged: live was `eb02b42`, so totalBytes-on-delete, storage-alert re-arm, retry-all, and watch Download still awaited one deploy before this branch.
- Production remains `https://xrender.uk` behind Access; deploys require explicit owner approval (ADR-0010). This change has no migration and adds no dependency.

## Next
1. Owner: review and merge `library-pagination-modern-ui`.
2. Owner: say "deploy" after merge. From an up-to-date `main`, follow `docs/runbooks/deploy.md` including the `wrangler.toml` drift check. No D1 migration is needed; the deploy also ships the four already-merged 2026-08-31 features if they are still absent live.
3. After deploy, verify one real library round trip: choose 50/page, open a card low on page 2, click Back to library, and confirm that card is visible; also check one 390px-wide mobile view.
4. Optional: click Retry all failed on `/stats` for the remaining pre-existing failures if their sizes still need recording; `too_large` rows above 1 GB will fail again by design.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Library pagination, URL-backed watch return, responsive modern UI, tests, and browser QA complete (not deployed).
- 2026-08-31 Download link on the watch page (PR #18, merged as `6e941c2`; not deployed as of the last live check).
- 2026-08-31 Storage alert keyed per 3 GiB step (PR #16, merged as `bd785d7`; not deployed as of the last live check).
- 2026-08-31 Retry all failed on `/stats` (PR #17, merged as `716e2e4`; not deployed as of the last live check).
- 2026-08-31 `DELETE /api/videos/:id` subtracts bytes from KV total (PR #15, merged as `7be8eeb`; not deployed as of the last live check).
