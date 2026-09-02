# 0019. Admit exact-email viewers through Cloudflare Access and authorize the owner in the Worker

Date: 2026-09-02 | Status: DECIDED | Supersedes: ADR-0004 in part | Evidence: `docs/research/2026-09-02-cloudflare-access-read-only-viewers.md`

## Context

ADR-0004 protects every route with Cloudflare Access but assumes every admitted person is the owner.
The owner wants a few trusted friends to browse the complete library without repeating the failed
One-time PIN flow or granting them membership in the owner's Cloudflare account. The Worker already
verifies the Access JWT and extracts its verified email, so another identity or role service would
duplicate working infrastructure.

## Decision

Keep Cloudflare Login, disable its account-member restriction after auditing other Access apps, and
replace x-downloader's account-member admission with an exact-email policy on the existing Access
application. Configure one `OWNER_EMAIL`; after verifying a non-empty signed email, allow the owner
all existing routes and allow every other admitted email only `GET /`, `GET /watch/:postId`,
`GET /v/:key`, and `GET /p/:postId`. Default every other and future route to owner-only, keep R2 private, and deploy the
Worker guard before admitting any viewer.

## Consequences

- easier: friends use their own Cloudflare accounts, receive no Cloudflare dashboard access, and need
  no WorkOS, OTP, application account, database row, or role-management UI.
- easier: one positive viewer-route allowlist protects GET routes that mutate state or spend X API
  quota and makes future routes owner-only by default.
- harder: the Access exact-email policy becomes the sole reader allowlist; an over-broad policy can
  expose the complete library even though the Worker still verifies the JWT.
- harder: removing a viewer requires both deleting the email from the policy and revoking the active
  Access session for immediate cut-off; already downloaded bytes cannot be recalled.
- revisit when: viewers need selected-video access, write capabilities, per-user state, or enough
  roles that one owner-email comparison no longer describes the product.
