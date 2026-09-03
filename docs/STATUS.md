Updated: 2026-09-03

## Now
- **Forward integration is ready to deploy:** the approved tag picker is layered onto current `main`, restoring Longest/Shortest duration sorting while retaining durable private R2 posters and exact-email owner/viewer authorization. All 87 tests pass.
- **Production is temporarily on stale Worker version `8e3a04a2-4f19-4ee0-8c92-21d65b34de07`:** its tag picker works, but its source predates the merged duration sort, durable-poster rendering, and read-only friend guard. No video or metadata was deleted.

## Next
1. Deploy the integrated Worker and verify 100% traffic, Access 302, and workers.dev 404.
2. Authenticated production smoke test: confirm Longest/Shortest, reuse an existing tag, create/save a new tag, and preserve a two-tag filter through Watch → Back.
3. Obtain one viewer's exact verified Cloudflare-account email; then execute the exact-email Access rollout and viewer/non-listed-account tests.
4. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.

## Blocked
- Access expansion is blocked on authenticated owner verification, one friend's exact verified Cloudflare-account email, and a separate non-listed account for the negative test.

## Done recently (last 5; older in JOURNAL)
- 2026-09-03 Diagnosed missing Longest/Shortest as a stale-branch deployment regression; forward-integrated tags with current main and passed 87 tests.
- 2026-09-03 Approved Library tag picker implemented with TDD, desktop/mobile browser QA, and deployed as Worker version `8e3a04a2` (later identified as stale versus main).
- 2026-09-03 Library tag picker option 3 selected, specified, and approved; not implemented.
- 2026-09-03 Basic Library tagging migration and Worker version `75a92145` deployed and route-verified.
- 2026-09-02 Deployed the combined friend guard and durable posters as `c31bf94a`; 100% active, 302 through Access, workers.dev 404, policy unchanged.
