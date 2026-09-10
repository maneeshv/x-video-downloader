Updated: 2026-09-11

## Now
- Deployment authorized; preflight is preserving playback features from the live 2026-09-04 Worker that were absent from Git. The recovered resume migration is already applied in production.
- **Option 1 is implemented and verified on `feat/library-cinematic-shelf`:** the [Cinematic shelf plan](superpowers/plans/2026-09-11-cinematic-shelf-library.md) is complete. Existing search, tags, sorts, pagination, Watch editing, Stats, and access controls are preserved. Both TypeScript projects and all 88 tests pass; desktop/mobile comparison and interaction evidence is in [design-qa.md](../design-qa.md).
- **Implementation includes PR #32:** the branch starts from `fd93d1b`, incorporating the [approved tag picker](superpowers/specs/2026-09-03-library-tag-picker-design.md), duration sorting, durable private posters, and exact-email authorization.
- **Last recorded deployment remains `4d969b9d-8ae9-4747-8561-6065f990c9df`:** the cinematic UI has not been deployed. The 2026-09-11 checks used local synthetic data only; see [JOURNAL](JOURNAL.md).

## Next
1. Owner review of the implemented [Cinematic shelf](../design-qa.md), then the normal review/merge and separately authorized deployment workflow.
2. Authenticated production smoke test: confirm Longest/Shortest, reuse an existing tag, create/save a new tag, and preserve a two-tag filter through Watch → Back.
3. Obtain one viewer's exact verified Cloudflare-account email; then execute the exact-email Access rollout and viewer/non-listed-account tests.
4. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.

## Blocked
- Access expansion is blocked on authenticated owner verification, one friend's exact verified Cloudflare-account email, and a separate non-listed account for the negative test.

## Done (last 5; older in JOURNAL)
- 2026-09-11 Implemented Option 1, preserved the current feature set, passed 88 tests and responsive browser QA; no deployment.
- 2026-09-10 Generated three imagegen Library previews and documented the complete functionality preservation contract; no code changes.
- 2026-09-03 Diagnosed missing Longest/Shortest as a stale-branch deployment regression; forward-integrated tags with current main, passed 87 tests, and deployed repaired Worker `4d969b9d` at 100%.
- 2026-09-03 Approved Library tag picker implemented with TDD, desktop/mobile browser QA, and deployed as Worker version `8e3a04a2` (later identified as stale versus main).
- 2026-09-03 Library tag picker option 3 selected, specified, and approved; not implemented.
