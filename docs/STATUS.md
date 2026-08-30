Updated: 2026-08-30

## Now
- End-to-end auth works: Access (Cloudflare IdP, account-members policy) → `/oauth/start` → `auth: ok`. First `/backfill` saw 354 bookmarks (156 with video) but **every download attempt throws** — 5 rows `pending`/`error=exception`, message swallowed. Logging added and deployed (`d3b4b637`); waiting for the next cron or a `/backfill` rerun to read the message via `wrangler tail`.
- `v1-worker` is code-complete and ready for a PR; remote `origin` = `github.com-personal:maneeshv/x-video-downloader` but pushes are rejected (publickey).

## Next
1. Read the download exception from the log, fix root cause, redeploy, rerun `/backfill`, confirm `downloaded > 0` and a video plays on `/`.
2. Owner: register `~/.ssh/github_personal.pub` on the `maneeshv` GitHub account; agent pushes `main` + `v1-worker` and opens the PR.
3. Verify the cron keeps advancing `lastRun` (`docs/runbooks/deploy.md` step 10).
4. v2 (owner intent): list/search/filter UI over the `bookmarks` D1 table.

## Blocked
- Download exception message (needs one more run with the new log line).
- Push/PR — SSH key for `github.com-personal` not accepted by GitHub (owner).

## Done recently
- 2026-08-30 Access switched to the Cloudflare IdP; OAuth completed; first backfill indexed 354 bookmarks into D1; download-exception logging added.
- 2026-08-30 `TELEGRAM_CHAT_ID` secret set from `getUpdates`; test alert delivered to the owner's chat. All 4 secrets + 3 vars now in place.
- 2026-08-30 Access enabled on the Production workers.dev route (owner); `TEAM_DOMAIN`/`POLICY_AUD` vars and `X_CLIENT_ID`/`X_CLIENT_SECRET` secrets set; redeployed; `/status` → 302 to the Access login (verified). Runbook §4/§5/§6 updated with the real dashboard path and values.
- 2026-08-30 Final review fix wave + re-review fix: `/v/:key` 304 on If-Modified-Since, 416 only on an unsatisfiable Range (other R2 faults now propagate); `download()` refuses unknown-length bodies (ADR-0009); multi-video partial-`downloaded` rows now point `r2_key` at whichever video actually stored, not always `videos[0]`; 9 minors. `npm test` 43/43.
- 2026-08-30 Task 9 (part): R2/KV/D1 created and bound, D1 migrated, Worker deployed twice (`PUBLIC_ORIGIN` set on 2nd), `TELEGRAM_BOT_TOKEN` secret set; `docs/runbooks/deploy.md` written; `docs/ARCHITECTURE.md` rewritten as built; `docs/GOTCHAS.md` pruned; `docs/runbooks/setup-x-developer-app.md` OAuth-2.0-vs-1.0a note added.
- 2026-08-30 Task 8 review fixes: `/v/:key` 206-only-on-Range, 304 on If-None-Match, safe key decode; `test/index.test.ts` 5 tests.
- 2026-08-30 Task 8: `src/html.ts` + `src/index.ts` — routes, Access gate, OAuth PKCE flow, scheduled handler; `test/index.test.ts` 4 tests.
- 2026-08-29 Task 7 (+ 2 review-fix rounds): `src/sync.ts` — run loop, downloads, circuit breaker, alerts; `test/sync.test.ts` 12 tests.
