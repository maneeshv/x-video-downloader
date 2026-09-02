# Read-only friend access through Cloudflare Access

Date: 2026-09-02 | Status: APPROVED 2026-09-02 by the owner (frozen; changes require a new dated spec)

Evidence: `docs/research/2026-09-02-cloudflare-access-read-only-viewers.md`
Decision: ADR-0018 (supersedes ADR-0004 in part)

## Problem

The library is useful to a few trusted friends, but the current authorization model treats every
person admitted by Cloudflare Access as the owner. The Worker verifies the signed Access JWT and
extracts its email, then discards that identity before routing. An admitted friend would therefore
receive delete, metadata, retry, settings, X OAuth, and backfill capabilities.

Friends must be able to browse the complete library without becoming members of the owner's
Cloudflare account. The failed email One-time PIN flow must not be reintroduced.

## Outcome

Cloudflare Login remains the only login method. The existing Access application admits an exact list
of verified email addresses. One configured owner email receives the product's existing capabilities;
every other admitted email receives a read-only library.

```text
Cloudflare account login
        |
        v
Exact-email Access policy ---- denied email --> blocked at Cloudflare
        |
        v
Signed Access JWT with verified email
        |
        v
Worker JWT verification
        |
        +---- OWNER_EMAIL match --> all existing routes
        |
        `---- other email -------> GET /, /watch/:id, /v/:key only
```

No WorkOS integration, friend database, role table, invitation UI, or new dependency is added.

## Identity and configuration

- Keep the existing Cloudflare identity provider and disable **Restrict to account members** only
  after auditing the other Access applications in the account. This identity-provider setting is
  account-wide; each application must still have a narrow policy.
- Edit the existing Worker Access application and retain its current audience tag. Creating another
  Access application would issue a different audience and be rejected by the Worker.
- Replace the current **Cloudflare account members** Include selector with one **Emails** Include
  containing the owner's and viewers' exact addresses. Do not retain broader admission rules.
- Each viewer uses a free Cloudflare account whose verified email exactly matches the policy entry.
  They are not invited into the owner's Cloudflare account and receive no Cloudflare dashboard role.
- Add `OWNER_EMAIL` as a non-secret Worker variable in both the real `wrangler.toml` and committed
  `wrangler.toml.example`. It is deployment-specific and must not be hardcoded in TypeScript.
- Compare the signed email and `OWNER_EMAIL` case-insensitively after trimming both. Do not otherwise
  rewrite Gmail dots, plus-addresses, or aliases.
- A valid JWT without a non-empty email is forbidden everywhere. A missing or empty `OWNER_EMAIL`
  grants nobody owner capability; it must never make every admitted user an owner.

The existing `Cf-Access-Jwt-Assertion` verification remains the trust boundary. Raw request headers
or an unverified JWT payload must never determine the role.

## Authorization

Authorization is a positive viewer-route allowlist, evaluated once after JWT verification and before
the existing route handlers. A method-only rule is unsafe because three GET routes change state or
spend money: `/oauth/start`, `/oauth/callback`, and `/backfill`.

| Route | Owner | Viewer | Reason |
|---|---:|---:|---|
| `GET /` | yes | yes | Browse, search, filter, sort, and paginate |
| `GET /watch/:postId` | yes | yes | Watch one downloaded video and read its metadata |
| `GET /v/:key` including Range requests | yes | yes | Stream or download the video bytes |
| `GET /stats` | yes | no | Operational details and recovery controls |
| `GET /status` | yes | no | Internal sync, auth, and X-account state |
| `GET /oauth/start`, `GET /oauth/callback` | yes | no | Writes PKCE state and X credentials |
| `GET /backfill` | yes | no | Spends X API quota and writes D1/R2/KV |
| All `/api/*` methods | yes | no | Metadata, favourite, delete, retry, and settings mutations |
| Any future route | yes by default | no by default | New functionality must opt into viewer access explicitly |

Downloading remains available to viewers. Streaming already transfers the same bytes, so hiding the
Download link would not create a meaningful security boundary.

The scheduled handler is unchanged: it has no human Access identity and continues to run the owner's
single X-account sync.

## Interface

Server authorization is authoritative; hiding controls is only a clear, honest viewer experience.

- The owner sees the current Library, Stats, Re-authorize, metadata, favourite, delete, retry,
  settings, backfill, and download controls unchanged.
- A viewer sees search, filters, sorting, pagination, the watch page, original-post link, streaming,
  download, and logout.
- A viewer does not receive the Stats or Re-authorize navigation, metadata form, favourite control,
  delete control, mutation JavaScript, or any operational page.
- The shared header shows a small `View only` label so the absence of controls is understandable.

## Revocation and limitations

To remove a viewer, first delete their exact email from the Access policy, then revoke their active
Access session for immediate cut-off. Removing only the policy entry may leave an existing session
usable until its token expires.

Revocation blocks future authorized requests. It cannot retract a video that the viewer already
downloaded, cached, recorded, or copied. This limitation is accepted for trusted viewers.

Keep the current Access session duration for v1. Custom session timing and application audit storage
are not needed until observed use warrants them.

## Rollout and rollback

The order is security-critical:

1. Add `OWNER_EMAIL`, the server-side route guard, viewer-specific rendering, and automated tests.
2. Deploy while the current Access policy still admits only the owner. Verify every owner operation.
3. Audit other Access applications, then disable **Restrict to account members** on the Cloudflare
   identity provider.
4. On the existing x-downloader application, replace the account-member selector with exact Emails
   containing only the owner. Verify the owner again in a fresh browser session.
5. Add one viewer email. Verify its read-only experience and directly test forbidden routes.
6. Verify a non-listed Cloudflare account is blocked at Access, then add the remaining viewers.

Changing the Access policy before deploying the Worker guard is forbidden: a newly admitted viewer
would temporarily receive full owner capability.

Rollback removes viewer emails and revokes their sessions, then restores **Restrict to account
members** and the prior account-member policy. The code-side owner guard can remain deployed safely.

## Acceptance criteria

1. A valid owner JWT retains every current route and capability.
2. A valid viewer JWT receives `200` for the Library, watch page, and video stream, including Range
   requests, and `403` for every other current route.
3. No JWT, an invalid JWT, or a valid JWT without a non-empty email receives no application content.
4. Missing or empty `OWNER_EMAIL` cannot grant owner capability; email comparison is case-insensitive.
5. Viewer HTML contains no owner navigation, mutation form, mutation controls, or mutation script and
   visibly identifies the session as view-only.
6. Owner HTML and behavior remain unchanged apart from any neutral role plumbing.
7. A listed Cloudflare account can sign in without becoming a member of the owner's Cloudflare
   account; a non-listed account is rejected by Access.
8. Removing a viewer email and revoking the session blocks a fresh request.
9. R2 remains private, the existing Access JWT signature/issuer/audience/expiry checks remain, and no
   database migration or new dependency is introduced.
10. Tests cover the complete owner/viewer route matrix, missing identity/configuration, case handling,
    viewer HTML, and the existing unauthenticated denial; typecheck and the full repository check pass.

## Deferred

- Per-video or expiring bearer links and public sharing.
- Roles beyond `owner` and `viewer`, or a KV/D1-backed role system.
- Viewer mutations, per-viewer favourites, watch history, comments, or playlists.
- WorkOS, One-time PIN, Cloudflare account-member invitations, service tokens, and custom sessions.
- Application-owned access logs, per-viewer rate limits, and a friend-management UI.

## Remaining decisions

None block implementation. The design intentionally grants every admitted viewer read and download
access to the complete library; selected-video sharing would be a separate feature and specification.
