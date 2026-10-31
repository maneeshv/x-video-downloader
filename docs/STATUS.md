Updated: 2026-10-31

## Now
- **Download queue + save-first backfill implemented, not deployed:** [spec](superpowers/specs/2026-10-31-download-queue-design.md) (APPROVED), [plan](superpowers/plans/2026-10-31-download-queue.md), ADR-0023. Uncommitted on branch `powerful-squirrel`; `npm run check` passes (97 tests). Production on 2026-10-31: 0 pending, 0 failed, but canceled `/backfill` runs may have left bookmarks unrecorded (GOTCHAS).
- **Option 1 is deployed and merged to `main` (PR #33, merge `bedc4ff`):** the [Cinematic shelf plan](superpowers/plans/2026-09-11-cinematic-shelf-library.md) is complete. Existing search, tags, sorts, pagination, Watch editing, Stats, and access controls are preserved. Both TypeScript projects and all 89 tests pass; desktop/mobile comparison and interaction evidence is in [design-qa.md](../design-qa.md).
- **Production version `150f0f24-08b7-44c5-8573-ed30aa2beafc` serves 100% of traffic:** custom domain and cron preserved, deployed source matches the verified candidate exactly, Access returns 302, workers.dev returns 404. Existing playback/resume/cache behavior was recovered from the previous live version and preserved. Rollback: `93f3b6c1-be69-4edf-ba36-58d9a70bbdc0`.

## Next
1. Owner OKs commit + PR + deploy of the download-queue branch (deploy preflight per `docs/runbooks/deploy.md`, including the live-bundle comparison). After deploy: run `/backfill` once, check `recorded`/`queued` and `/queue`, then tick the plan's last two boxes.
2. Sign into Cloudflare Access for an authenticated production smoke test (the available browser reaches the login screen): confirm Longest/Shortest, reuse an existing tag, create/save a new tag, and preserve a two-tag filter through Watch → Back.
3. Obtain one viewer's exact verified Cloudflare-account email; then execute the exact-email Access rollout and viewer/non-listed-account tests.
4. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.

## Blocked
- Access expansion is blocked on authenticated owner verification, one friend's exact verified Cloudflare-account email, and a separate non-listed account for the negative test.

## Done (last 5; older in JOURNAL)
- 2026-10-31 Diagnosed the `/backfill` timeout (canceled requests leave bookmarks unrecorded); spec approved; built save-first backfill and the `/queue` page with TDD and local browser QA (not deployed).
- 2026-09-11 Deployed Option 1 at 100%, retained live-only playback features, passed 89 tests and source/routing verification.
- 2026-09-10 Generated three imagegen Library previews and documented the complete functionality preservation contract; no code changes.
- 2026-09-03 Diagnosed missing Longest/Shortest as a stale-branch deployment regression; forward-integrated tags with current main, passed 87 tests, and deployed repaired Worker `4d969b9d` at 100%.
- 2026-09-03 Approved Library tag picker implemented with TDD, desktop/mobile browser QA, and deployed as Worker version `8e3a04a2` (later identified as stale versus main).
