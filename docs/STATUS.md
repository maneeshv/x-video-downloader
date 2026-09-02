Updated: 2026-09-02

## Now
- **Durable private R2 posters are live in production.** All 198 eligible posters were migrated with 0 unavailable and 0 failures; Library and Watch now render Access-gated `/p/:postId` URLs from private R2.
- **Current production has Longest/Shortest duration sorting and 181/198 live downloaded rows with duration; 17 remain unavailable.** The custom domain redirects unauthenticated requests to Access and workers.dev remains disabled.
- **The combined friend guard and durable-poster Worker is deployed as `c31bf94a-e996-43b9-9837-e99490e11d3a` at 100%:** [`spec`](superpowers/specs/2026-09-02-read-only-friend-access-design.md), [ADR-0019](decisions/0019-cloudflare-exact-email-read-only-viewers.md), and [`implementation plan`](superpowers/plans/2026-09-02-read-only-friend-access.md). Both TypeScript projects and all 86 tests pass, including viewer access to `/p/:postId`; edge checks are 302 through Access and 404 on workers.dev. Access remains account-members-only, so no viewer is admitted. Rollback is `8df14d41-e59d-4f7e-b8b8-95d302efebe3`.

## Next
1. Review and merge the deployed `explore/cloudflare-access-identity-injection` branch.
2. Verify owner Library, posters, watch/edit/favourite, stats/status, retry/settings, backfill, and OAuth-start before changing Access.
3. Obtain one viewer's exact verified Cloudflare-account email; then execute the exact-email Access rollout and viewer/non-listed-account tests.
4. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.
5. Decide whether the 17 remaining duration-unavailable rows justify R2/MP4 inspection; separately save/retry a higher file limit if wanted.

## Blocked
- Access expansion is blocked on authenticated owner verification, one friend's exact verified Cloudflare-account email, and a separate non-listed account for the negative test.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Deployed the combined friend guard and durable posters as `c31bf94a`; 100% active, 302 through Access, workers.dev 404, policy unchanged.
- 2026-09-02 Resolved friend-access conflicts against current main, renumbered its decision to ADR-0019, and added private poster GETs to the viewer allowlist; 86 tests pass.
- 2026-09-02 Durable private R2 posters deployed in two phases; 198/198 eligible posters migrated and verified without X-CDN poster requests.
- 2026-09-02 Published `explore/cloudflare-access-identity-injection` after explicit owner approval; PR creation and merge remain.
- 2026-09-02 Read-only friend Worker guard deployed as `c0852a7b`; 78 tests and edge checks pass; authenticated owner verification and Access policy change remain.
