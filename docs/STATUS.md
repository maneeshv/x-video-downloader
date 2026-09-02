Updated: 2026-09-02

## Now
- **Read-only friend access is implemented locally:** [`spec`](superpowers/specs/2026-09-02-read-only-friend-access-design.md), [ADR-0018](decisions/0018-cloudflare-exact-email-read-only-viewers.md), and [`implementation plan`](superpowers/plans/2026-09-02-read-only-friend-access.md). The fail-closed Worker guard, viewer-safe UI, `OWNER_EMAIL`, config/runbook updates, and complete route tests pass all 78 tests; no Access policy has been broadened.
- **Production still runs Worker version `36bc3020-0d82-4549-9293-8fe3917ddad8`:** its duration repair is now merged in `origin/main` `94055d4`; production has duration for 181/198 live downloaded rows. The friend-access guard is not deployed yet, and Access remains account-members-only.
- **Rollout order remains security-critical:** the implementation is rebased onto current `origin/main`; deploy and verify the owner guard first, then replace Access admission with exact emails only after viewer addresses are supplied.

## Next
1. Rerun checks, deploy the guard with the verified owner email, and verify owner behavior before changing Access.
2. Obtain one viewer's exact verified Cloudflare-account email; then execute the existing-app exact-email policy rollout and second/non-listed account tests.
3. Update the main checkout's gitignored `wrangler.toml` with `OWNER_EMAIL` so new Paseo worktrees do not omit it.
4. Decide whether the 17 remaining duration-unavailable rows justify R2/MP4 inspection.
5. Save the desired operating file limit on `/stats` and explicitly retry/backfill old `too_large` rows if wanted.

## Blocked
- Viewer admission awaits at least one friend's exact verified Cloudflare-account email and access to a separate non-listed account for the negative test; neither blocks deploying the guard.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Read-only friend Worker guard, viewer-safe UI, configuration, and route matrix implemented; 78 tests pass; deployment and Access policy change remain.
- 2026-09-02 Duration repair deployed and run: 181/198 live Library rows now have duration; 17 remain unavailable.
- 2026-09-02 Exact-email, owner-versus-viewer Cloudflare Access design approved; ADR-0018 and its implementation plan are frozen.
- 2026-09-02 Library duration data flow deployed as `3c22564d`; migration applied and Paseo backfill/browser verification completed.
- 2026-09-02 Library sorting by largest/smallest file size implemented and verified on `fix/library-sort-by-size`; not deployed.
