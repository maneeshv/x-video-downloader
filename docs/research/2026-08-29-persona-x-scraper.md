# Research: reading X bookmarks & downloading video without the paid API (persona: scraping pragmatist)
Date: 2026-08-29 | Source: brainstorm subagent with web citations + one live test

## Verified facts
### A. Cookie + internal GraphQL (what the X web app itself does)
- Auth = cookies `auth_token` (40 hex) + `ct0`, sent as `Cookie:` plus headers `x-csrf-token: <ct0>`, `authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA` (public web bearer, same for everyone), `x-twitter-auth-type: OAuth2Session`, `x-twitter-active-user: yes`. Sources: https://github.com/displace-agency/x-bookmarks-exporter/blob/main/src/api.ts , https://github.com/vladkens/twscrape
- Bookmarks op (as of 2026-08-29): `GET https://x.com/i/api/graphql/iblrFnKr6PZUR-dWpfXG6g/Bookmarks?variables={count,cursor,includePromotedContent}&features={...}`. Missing/outdated `features` → HTTP 400 (twscrape raises `GqlFeaturesOutdatedError`).
- **queryId source, auto-updated daily:** https://github.com/fa0311/TwitterInternalAPIDocument/blob/master/docs/markdown/GraphQL.md (pushed 2026-08-29). Alternative: regex `queryId:"([^"]+)",operationName:"Bookmarks"` over `abs.twimg.com/responsive-web/client-web/main.*.js`. Rotation claimed every 2–4 weeks (https://github.com/sytelus/xarchive).
- Pagination: entry with `entryId` starting `cursor-bottom` / `cursorType: "Bottom"` → `value` is the next cursor; ~100 items/page max, `count` selectable.
- Video URLs: `legacy.extended_entities.media[].video_info.variants[]` = `{content_type, bitrate, url}`; mp4s on `video.twimg.com` plus one `application/x-mpegURL`. Pick max `bitrate` among `video/mp4`.
- **Live-tested:** `video.twimg.com/.../*.mp4?tag=14` returns 200 + `Accept-Ranges: bytes` with **no cookies or headers**. `cdn.syndication.twimg.com/tweet-result?id=&token=` also works anonymously (token = yt-dlp's base36 formula) and returns `mediaDetails[].video_info.variants`; deleted/protected → 404.
- `x-client-transaction-id`: X's anti-bot header. twscrape regenerates on 404; xarchive replays a browser-captured one; x-bookmarks-exporter and xBookmarksObsidian send none and report working. Generators: https://github.com/iSarabjitDhiman/XClientTransaction , https://github.com/swyxio/XClientTransactionJS
- Rate limits: response headers `x-rate-limit-limit/remaining/reset`; 429 on exceed. Tools use 0.5–2.5 s inter-page delays. Error codes: `(326) Denied by access control` = account locked; `(32) Could not authenticate you` = dead cookie (https://github.com/vladkens/twscrape/blob/main/twscrape/queue_client.py).
- Still maintained (GitHub pushed_at): twscrape 2026-08-28 (v0.20.1 2026-08-25 "updated GraphQL op IDs, fixed transaction ID"), twitter-web-exporter 2026-08-24, gallery-dl 2026-08-29 (supports `x.com/i/bookmarks` with cookies), xarchive 2026-08-02, tweetxvault 2026-07-20.

### B. Headless browser login
Camoufox blocked at username step ("unusual login activity"); plain Playwright gets through then hits verification challenges (https://github.com/daijro/camoufox/issues/274). twscrape needs IMAP creds to answer email-code challenges. Locks need manual browser unlock + captcha (https://github.com/mikf/gallery-dl/discussions/5684). **Strictly worse than A**: ends with the same cookies plus captcha/2FA/fingerprint pain.

### C. Official X API v2
Free tier gone for new devs since 2026-02-06; pay-per-use only. Bookmarks = "Owned Reads" at **$0.001/resource, deduped per 24 h UTC** (https://docs.x.com/x-api/getting-started/pricing , https://postproxy.dev/blog/x-api-pricing-2026/). Needs OAuth 2.0 PKCE user context (`bookmark.read`, `offline.access` for refresh tokens); returns max 800 most recent; historically 180 req/15 min. 100 new bookmarks/day ≈ $3/mo. Requires a card on file and an OAuth app.

### D. Alternatives
- "Download your data" archive does **not** include bookmarks.
- Nitter: X sent a cease-and-desist 2026-08-24; nitter.net offline (https://techcrunch.com/2026/08/25/x-sends-cease-and-desist-to-open-source-project-nitter-over-alleged-scraping/). Dead.
- yt-dlp: works logged-out via guest token → `TweetResultByRestId`, falls back to syndication on 429; NSFW/protected need `auth_token` (https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/twitter.py). Cannot run inside a Worker.
- In-browser tools (twitter-web-exporter userscript, xarchive extension) intercept the web app's own GraphQL responses — zero bot risk, but local only.

### E. Video specifics
Best variant = max `bitrate` where `content_type == video/mp4`; skip m3u8 (mp4s are progressive + range-capable). GIF = `type: animated_gif`, single mp4 variant, `bitrate: 0`. Multi-video = multiple `media[]` entries. Quoted video lives in `quoted_status_result.result.legacy.extended_entities`. Deleted/protected → `TweetTombstone` / `TweetUnavailable{reason}`. Age-restricted → `NsfwViewerHasNoStatedAge` unless the account has a birth date set.

## Uncertain
- **Whether x.com/i/api accepts calls from Cloudflare Workers egress IPs.** Scraping blogs say datacenter IPs die fast (https://scrapfly.io/blog/posts/how-to-scrape-twitter), but that's unauthenticated scale scraping; cookie tools are designed for laptops. No evidence either way for one authed account at low cadence. **Test with a throwaway Worker before designing further.**
- Real `x-rate-limit-limit` for Bookmarks (≈500/15 min is folklore; read the header).
- `auth_token` lifetime: ~1 year per x-bookmarks-exporter; gallery-dl users report days–weeks. Survives until logout / password change / lock.
- Whether `x-client-transaction-id` becomes mandatory for Bookmarks.

## Options ranked (this persona)
1. Cookie + GraphQL from a Worker cron; mp4 → R2. $0. Risks: datacenter-IP lock, cookie death, monthly breakage.
2. Same code run at home (launchd / Pi / Tailscale) pushing to the Worker. Residential IP removes the biggest unknown. (Violates "fully cloud" constraint.)
3. Official API pay-per-use (~$1–5/mo). Most stable, ToS-compliant, 800-item cap, needs OAuth app + card.
4. Browser extension → Worker webhook (intercept Bookmarks GraphQL in the real browser). Zero ban risk; only works while the browser is open.
5. Headless login — strictly worse than 1.

## Failure modes & mitigations
| Failure | Signal | Mitigation |
|---|---|---|
| Cookie dead | 401 / error 32 | alert; re-paste cookies |
| Account lock | 403 error 326 | stop cron immediately; unlock in browser; consider residential IP |
| queryId/features rotated | 404 / 400 | re-discover from fa0311 doc or main.js regex; cache |
| 429 | header | sleep to `x-rate-limit-reset`; one page per run is plenty |
| Tweet gone | tombstone | log, skip |
| NSFW | `NsfwViewerHasNoStatedAge` | set birth date on account |
| mp4 fetch fails | non-200 | fallback to syndication endpoint → re-resolve |

## Recommendation
Option 1 as ~150 lines; first commit = a Worker that fetches one Bookmarks page and logs status + rate-limit headers. If X rejects CF egress, keep identical code and run from home (option 2) or switch to option 3. Poll every 15–30 min, 1 page (count 20), download max-bitrate mp4 to R2 with a HEAD-first size check. Re-auth: on 401/32/326 set a KV flag, send one Telegram message (Bot API = one `fetch`, free), suppress repeats until fixed; cookies come from DevTools → Application → Cookies → x.com (30 s).
