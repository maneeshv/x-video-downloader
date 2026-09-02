Updated: 2026-09-02

## Now
- **The read-only friend guard is deployed as Worker version `c0852a7b-a9b7-49b4-a4d3-b83682928919`:** [`spec`](superpowers/specs/2026-09-02-read-only-friend-access-design.md), [ADR-0018](decisions/0018-cloudflare-exact-email-read-only-viewers.md), and [`implementation plan`](superpowers/plans/2026-09-02-read-only-friend-access.md). `OWNER_EMAIL`, the fail-closed route allowlist, and viewer-safe UI pass all 78 tests; Access remains account-members-only, so no viewer is admitted yet.
- **Deployment preserved the previously live Longest/Shortest duration sorting:** this branch carries equivalent source from unmerged `66cd0fb`. Wrangler reports `c0852a7b` at 100%; xrender.uk redirects unsigned requests through the unchanged Access audience, workers.dev is 404, and rollback is `10f4cb53-6557-4535-984e-167903496483`.
- **Authenticated owner verification is still required before Access changes:** Chrome control timed out three times; no owner capability or data was mutated, and the policy was not broadened.

## Next
1. Verify the owner Library, watch/edit/favourite, stats/status, retry/settings, backfill, and OAuth-start paths from a working signed-in browser before changing Access.
2. Obtain one viewer's exact verified Cloudflare-account email; then execute the existing-app exact-email policy rollout and viewer/non-listed-account tests.
3. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.
4. Decide whether the 17 remaining duration-unavailable rows justify R2/MP4 inspection.
5. Save the desired operating file limit on `/stats` and explicitly retry/backfill old `too_large` rows if wanted.

## Blocked
- Access expansion is blocked on authenticated owner verification, at least one friend's exact verified Cloudflare-account email, and a separate non-listed account for the negative test. The guard is safely deployed meanwhile.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Read-only friend Worker guard deployed as `c0852a7b`; 78 tests and edge checks pass; authenticated owner verification and Access policy change remain.
- 2026-09-02 Longest/Shortest Library duration sorting deployed as `10f4cb53`; commit `66cd0fb` is carried here pending its separate merge.
- 2026-09-02 Duration repair deployed and run: 181/198 live Library rows now have duration; 17 remain unavailable.
- 2026-09-02 Exact-email, owner-versus-viewer Cloudflare Access design approved; ADR-0018 and its implementation plan are frozen.
- 2026-09-02 Library duration data flow deployed as `3c22564d`; migration applied and Paseo backfill/browser verification completed.
