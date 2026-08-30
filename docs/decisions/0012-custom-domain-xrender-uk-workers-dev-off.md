# 0012. The Worker serves on the custom domain `xrender.uk`; workers.dev is off
Date: 2026-08-30 | Status: DECIDED (owner: "go", 2026-08-30) | Supersedes: — (amends ADR-0004: the Access-gated route is now the custom domain) | Evidence: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ , https://developers.cloudflare.com/workers/configuration/routing/workers-dev/

## Context
The owner registered `xrender.uk` on Cloudflare (2026-08-30) and asked to serve the Worker there instead of `x-downloader.x-downloader.workers.dev`. Cloudflare treats `workers.dev` as a Free-plan hobby hostname and recommends a route or Custom Domain for production. The code has no hostname baked in: the OAuth callback and the post-login redirect both derive from `[vars] PUBLIC_ORIGIN`. Options: a Custom Domain (Cloudflare creates the DNS record + certificate, all paths go to the Worker), a Route (needs a placeholder proxied DNS record and a `/*` pattern), apex vs subdomain, and whether to keep `workers.dev` alive alongside.

## Decision
`[[routes]] pattern = "xrender.uk", custom_domain = true` on the apex; `PUBLIC_ORIGIN = "https://xrender.uk"`. `workers_dev` is left unset, which wrangler infers as `false` once a route exists, so the old URL returns 404 — one origin, one OAuth callback, one Access hostname. No code change. The existing Access application (Worker-scoped, "All traffic") already covers the new hostname with the same AUD, verified by `curl` → `302` to `orange-sky-811f.cloudflareaccess.com/…?kid=<POLICY_AUD>` on both `/` and `/status`.

## Consequences
- easier: real zone → Cloudflare zone features (WAF/rate-limit rules, analytics) are available if ever wanted; a memorable URL; certificate and DNS are managed by Cloudflare.
- harder: the X developer app's callback URL must be exactly `https://xrender.uk/oauth/callback` (owner step in console.x.com) — until it is, `/oauth/start` fails at X's consent screen (existing KV tokens keep the cron working). A subdomain later (e.g. `x.xrender.uk`) is a two-line change (`pattern`, `PUBLIC_ORIGIN`) plus the same X-console edit.
- revisit when: the domain lapses or is repurposed (set `workers_dev = true`, drop `[[routes]]`, restore the old `PUBLIC_ORIGIN`, re-edit the X callback), or a second Worker needs the apex (move this one to a subdomain).
