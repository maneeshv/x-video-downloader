# Implement read-only friend access

Spec: `../specs/2026-09-02-read-only-friend-access-design.md`
Decision: `../../decisions/0019-cloudflare-exact-email-read-only-viewers.md`

The Worker authorization guard must be deployed and verified before the Access policy admits any
viewer. No step below changes that order.

## 1. Add failing authorization and rendering tests

- [x] Extend the existing `test/index.test.ts` app helper with `OWNER_EMAIL` and separately signed
  owner/viewer JWTs, keeping distinct JWKS cache keys.
- [x] Assert the owner retains every existing route and capability.
- [x] Assert a viewer receives only `GET /`, `GET /watch/:postId`, `GET /v/:key` including Range, and
  `GET /p/:postId`;
  `/stats`, `/status`, `/oauth/*`, `/backfill`, every `/api/*`, and non-GET requests return `403`.
- [x] Assert a missing/empty JWT email is denied everywhere, a missing/empty `OWNER_EMAIL` elevates
  nobody, and owner email comparison is case-insensitive.
- [x] Assert viewer HTML has the `View only` label and no Stats/Re-authorize links, metadata form,
  favourite/delete controls, or mutation script. Assert owner HTML remains unchanged.
- [x] Run the focused tests and confirm they fail for the missing behavior.

## 2. Implement the single authorization boundary

- [x] Add required `OWNER_EMAIL` to `AppEnv` in `src/index.ts`.
- [x] Retain the `{ email }` returned by the existing `verifyAccessJwt`; reject a missing or blank
  verified email before any route handler.
- [x] Compare normalized email and `OWNER_EMAIL`, with a blank owner value matching nobody.
- [x] Add one positive viewer-route check before the route chain. Permit exactly Library, watch,
  video, and poster GET routes; return `403` for every other non-owner request.
- [x] Do not add middleware, a role abstraction, storage, dependency, or database migration.

## 3. Render the viewer experience

- [x] Pass `isOwner` only to renderers that contain role-dependent UI.
- [x] On the Library, hide Stats and Re-authorize from viewers and show `View only`.
- [x] On the watch page, keep playback, readable metadata, original-post link, download, Back, and
  logout; omit the editing form, favourite/delete controls, and mutation JavaScript for viewers.
- [x] Keep `/stats` unchanged because the server never renders it for viewers.
- [x] Run focused route/UI tests, then `npm run check`.

## 4. Update configuration and built-state documentation

- [x] Add a non-secret `OWNER_EMAIL` placeholder to `wrangler.toml.example` and the real ignored
  `wrangler.toml`; verify the deploy pre-check shows only expected real IDs/values.
- [x] Update `docs/ARCHITECTURE.md` from account-member/single-owner reality to the built role flow.
- [x] Update `docs/runbooks/deploy.md` with exact-email onboarding, revocation, verification, rollback,
  and the rule to replace rather than retain broader admission.
- [x] Update `docs/GOTCHAS.md`, `docs/JOURNAL.md`, and `docs/STATUS.md` in the implementation session.

## 5. Deploy the guard before expanding Access

Combined Worker version `c31bf94a-e996-43b9-9837-e99490e11d3a` is deployed at 100% with the
account-members policy unchanged; edge checks pass and rollback is
`8df14d41-e59d-4f7e-b8b8-95d302efebe3`. The checkbox remains open until authenticated owner
verification is completed from a working signed-in browser.

- [ ] With the account-members policy unchanged, deploy the Worker and verify the configured owner can
  browse, edit metadata, favourite, delete a disposable test item if available, retry, change the
  file limit, run backfill, and enter X reauthorization without completing unnecessary consent.
- [ ] Verify missing/incorrect `OWNER_EMAIL` fails closed before continuing.

## 6. Change Cloudflare admission

- [ ] Audit every Access application for broad policies affected by disabling the Cloudflare identity
  provider's account-member restriction.
- [ ] Disable **Restrict to account members** for the Cloudflare identity provider.
- [ ] Edit the existing x-downloader Access application; keep its current AUD and Cloudflare-only login.
- [ ] Replace the **Cloudflare account members** Include with exact **Emails** containing only the
  owner, then verify the owner in a fresh session.
- [ ] Add one viewer email and verify Library/watch/video/poster/download access, hidden controls, and direct
  `403` responses from owner-only routes.
- [ ] Verify a non-listed Cloudflare account is rejected at Access, then add remaining viewers.

## 7. Rollback and final verification

- [ ] If authorization or admission is wrong, remove viewer emails and revoke their Access sessions;
  restore **Restrict to account members** and the former account-member policy if necessary.
- [ ] Confirm R2 remains private, `xrender.uk` still redirects an unauthenticated browser to Access,
  the old workers.dev hostname remains disabled, and the scheduled sync advances normally.
- [ ] Record the deployed Worker version, manual owner/viewer/denied-account evidence, rollback target,
  and final test count in `docs/JOURNAL.md` and `docs/STATUS.md`.
