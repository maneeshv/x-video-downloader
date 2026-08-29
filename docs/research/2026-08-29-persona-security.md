# Research: security, account safety, open-source hygiene (persona: security reviewer)
Date: 2026-08-29 | Source: brainstorm subagent with web citations

## Threat model
- Worker secrets are write-only after `wrangler secret put` (https://developers.cloudflare.com/workers/configuration/secrets/), but anyone who can **deploy code** to the Worker can exfiltrate them in one line. Perimeter = Cloudflare login, any API token with Workers Edit scope, CI secrets.
- `auth_token` + `ct0` = full X web session (DMs, posting, account changes). Password-equivalent. X has no scoped/read-only session; the only scoping tool is a **separate account**.
- Mitigations: dedicated bookmark-only X account (or accept full-takeover blast radius on main); 2FA/passkey on X; hardware key/passkey on Cloudflare; no broad-scope API tokens in `~/.wrangler`.
- Rotation: password change invalidates all sessions. Rotate quarterly or on suspicion; auth_token otherwise lasts months–years.
- Detection: X Settings → Security → Apps and sessions shows device/location per session; the Worker's session should appear as a stable Cloudflare datacenter. "Log out all other sessions" is the kill switch.

## Repo hygiene for open source
- Never commit: auth_token, ct0, Cloudflare API tokens, `.dev.vars`, `.env*`, `.wrangler/`.
- Safe to commit: account_id, bucket/KV names, Worker name (https://community.cloudflare.com/t/is-it-safe-to-publish-wrangler-toml-with-account-id-zone-id/116785). Still ship `wrangler.toml.example` and gitignore the real one so clones don't deploy into the owner's account.
- GitHub push protection (free on public repos) + `gitleaks` pre-commit with a custom rule for `auth_token=[0-9a-f]{40}`.
- Cloneability = README with: copy example config, create bucket, two `wrangler secret put`, `wrangler deploy`. No hardcoded IDs in code.

## Serving videos safely
- Custom domain on R2 makes the bucket public by default (https://developers.cloudflare.com/r2/buckets/public-buckets/); r2.dev is public too. Unguessable keys are obscurity, not auth (leak via referer/history).
- **Recommended:** no public bucket. Worker route `/v/<key>` streams from the R2 binding, protected by Cloudflare Access (one-time-PIN email login, free ≤50 users). Since 2025-10 Access is one-click on a Worker (https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/). Also validate `cf-access-jwt-assertion` in the Worker so a misconfigured route can't bypass.
- Skip presigned URLs (don't work on custom domains; needs an issuer) and basic-auth (another secret, no MFA).

## X account risk
- ToS bans scraping / non-API access outright (https://techcrunch.com/2023/09/08/x-updates-its-terms-to-ban-crawling-and-scraping); "own data" is no carve-out. Enforcement stepped up in 2026 (https://opentweet.io/blog/twitter-automation-rules-2026).
- Realistic ladder for read-only low-volume: 429 → temporary "verify it's you" lock → suspension only if it looks like a bot farm. Triggers: new-IP logins, bursts.
- Look boring: one run per few hours, cap pages per run, sequential requests, 1–3 s jitter, exact web-client headers (`x-csrf-token`=ct0, `x-twitter-auth-type: OAuth2Session`, current bearer, browser UA), stop on first 429/403 until next run, no parallel video fetches.
- Egress IPs: no evidence X blocks Worker egress; session will show as a datacenter location (the main "new device" signal). Expect a one-time verify prompt after first deploy. Fallback if blocked: fetch from a home machine via Cloudflare Tunnel.

## Legal note
Private-use copies of publicly posted video for personal viewing: ToS problem far more than a copyright one; enforcement targets redistributors. Don't re-host publicly (the Access gate matters). Realistic consequence = X acting on the account.

## Guardrails for agent-written code
- Secrets in logs: one helper builds the cookie header; log only status + URL path; test asserts serialized log objects never contain the token; CI grep for `Cookie`/`auth_token` in log calls.
- Bucket deletion: R2 bucket lock with indefinite retention (https://developers.cloudflare.com/r2/buckets/bucket-locks/); agent/CI API token scoped to Workers Scripts Edit + R2 Object Read/Write only.
- Request spam: hard-coded `MAX_REQUESTS_PER_RUN` (~10) and `MAX_DOWNLOADS_PER_RUN` (~5) as constants; cron-only sync (no HTTP-triggered sync); on 401/403/429 write `paused_until` and skip runs 24 h, manual clear.
- Money: Cloudflare budget alert (https://developers.cloudflare.com/billing/manage/budget-alerts/) + R2 usage notification; in code skip files >200 MB and skip run if total bytes > cap (alerts are informational; the cap must be in code).
