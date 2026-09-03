Updated: 2026-09-03

## Now
- **The forward-integrated Worker is live as version `4d969b9d-8ae9-4747-8561-6065f990c9df` at 100%:** the approved tag picker now coexists with restored Longest/Shortest duration sorting, durable private R2 posters, and exact-email owner/viewer authorization. All 87 tests pass; the custom domain returns the expected Access 302 and workers.dev remains 404.
- **No data was lost during the stale deployment:** both additive D1 migrations were already applied, and the repair required no production data mutation.

## Next
1. Authenticated production smoke test: confirm Longest/Shortest, reuse an existing tag, create/save a new tag, and preserve a two-tag filter through Watch → Back.
2. Obtain one viewer's exact verified Cloudflare-account email; then execute the exact-email Access rollout and viewer/non-listed-account tests.
3. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.

## Blocked
- Access expansion is blocked on authenticated owner verification, one friend's exact verified Cloudflare-account email, and a separate non-listed account for the negative test.

## Done recently (last 5; older in JOURNAL)
- 2026-09-03 Diagnosed missing Longest/Shortest as a stale-branch deployment regression; forward-integrated tags with current main, passed 87 tests, and deployed repaired Worker `4d969b9d` at 100%.
- 2026-09-03 Approved Library tag picker implemented with TDD, desktop/mobile browser QA, and deployed as Worker version `8e3a04a2` (later identified as stale versus main).
- 2026-09-03 Library tag picker option 3 selected, specified, and approved; not implemented.
- 2026-09-03 Basic Library tagging migration and Worker version `75a92145` deployed and route-verified.
- 2026-09-02 Deployed the combined friend guard and durable posters as `c31bf94a`; 100% active, 302 through Access, workers.dev 404, policy unchanged.
