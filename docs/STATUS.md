Updated: 2026-08-30

## Now
- `v1-worker` is code-complete (43/43 tests, typecheck clean, final review clean) and ready to merge to `main`. See `docs/ARCHITECTURE.md` (as built).
- **Deployed and gated**: `https://x-downloader.x-downloader.workers.dev` (version `bbc12cbd`) sits behind Cloudflare Access (owner email, one-time PIN), has the X OAuth 2.0 client secrets, R2/KV/D1 bound, cron every 30 min. Not yet authorized against X — nothing downloads until the owner completes `/oauth/start`.

## Next (in order)
1. Owner: get through the Access login (OTP email was not arriving as of 2026-08-30 — Access sends nothing if the typed email isn't allowed by the policy; new Zero Trust orgs default to "Sign in with Cloudflare" instead of OTP, which also works). Then
2. Owner: open `https://x-downloader.x-downloader.workers.dev/oauth/start` (Access PIN login → X consent), then `/status` should show `auth: "ok"`; then open `/backfill` once and report the JSON (`docs/runbooks/deploy.md` step 9). If `seen>0`/`downloaded==0`, agent tries the `tweet.fields`→`post.fields` fallback.
3. Agent: verify the first cron run (`docs/runbooks/deploy.md` step 10). Owner chose a **PR** for `v1-worker` → `main`; the repo has no git remote yet, so a GitHub repo must be created first (owner to confirm name/visibility).
4. v2 (owner intent): list/search/filter UI over the `bookmarks` D1 table.

## Blocked
- Access OTP email not arriving (owner, dashboard) — see Next 1.
- No git remote → PR cannot be raised until a GitHub repo exists (owner to confirm).

## Done recently
- 2026-08-30 `TELEGRAM_CHAT_ID` secret set from `getUpdates`; test alert delivered to the owner's chat. All 4 secrets + 3 vars now in place.
- 2026-08-30 Access enabled on the Production workers.dev route (owner); `TEAM_DOMAIN`/`POLICY_AUD` vars and `X_CLIENT_ID`/`X_CLIENT_SECRET` secrets set; redeployed; `/status` → 302 to the Access login (verified). Runbook §4/§5/§6 updated with the real dashboard path and values.
- 2026-08-30 Final review fix wave + re-review fix: `/v/:key` 304 on If-Modified-Since, 416 only on an unsatisfiable Range (other R2 faults now propagate); `download()` refuses unknown-length bodies (ADR-0009); multi-video partial-`downloaded` rows now point `r2_key` at whichever video actually stored, not always `videos[0]`; 9 minors. `npm test` 43/43.
- 2026-08-30 Task 9 (part): R2/KV/D1 created and bound, D1 migrated, Worker deployed twice (`PUBLIC_ORIGIN` set on 2nd), `TELEGRAM_BOT_TOKEN` secret set; `docs/runbooks/deploy.md` written; `docs/ARCHITECTURE.md` rewritten as built; `docs/GOTCHAS.md` pruned; `docs/runbooks/setup-x-developer-app.md` OAuth-2.0-vs-1.0a note added.
- 2026-08-30 Task 8 review fixes: `/v/:key` 206-only-on-Range, 304 on If-None-Match, safe key decode; `test/index.test.ts` 5 tests.
- 2026-08-30 Task 8: `src/html.ts` + `src/index.ts` — routes, Access gate, OAuth PKCE flow, scheduled handler; `test/index.test.ts` 4 tests.
- 2026-08-29 Task 7 (+ 2 review-fix rounds): `src/sync.ts` — run loop, downloads, circuit breaker, alerts; `test/sync.test.ts` 12 tests.
