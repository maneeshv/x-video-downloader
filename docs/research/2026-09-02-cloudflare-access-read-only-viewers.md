# Cloudflare Access identity for read-only viewers

Date: 2026-09-02

## Verified facts

- Cloudflare can be the Access identity provider without limiting authentication to members of the
  owner's Cloudflare account. When **Restrict to account members** is disabled, any Cloudflare user
  may authenticate, but the Access application's policies still decide whether they are admitted.
- Access policies support exact **Emails** selectors. Identity selectors are checked at login, not
  continuously on every request.
- An admitted request carries a signed application JWT in `Cf-Access-Jwt-Assertion`. Its `email`
  claim is verified by the identity provider; the application must still validate the JWT signature,
  issuer, audience, and expiry before trusting it.
- Removing an email prevents a new matching session, but does not itself invalidate an already-issued
  application token. Immediate removal requires deleting the email from the policy and revoking that
  user's Access session.
- The application logout URL clears the user's Access session across the team, not just this one app.

## Sources

- [Cloudflare as identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/)
- [Access policies and selectors](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Access application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access session management and revocation](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)

