Updated: 2026-08-30

## Now
- **v1 works end to end** (2026-08-30): `/backfill` → 5 downloaded, 0 failed, 160 MB in R2; D1 has 354 rows (198 no_video, 151 pending). Pending videos drain at 5 per cron tick (every 30 min → ~15 h), or faster by hitting `/backfill` repeatedly.
- `main` and `v1-worker` are pushed to `origin` (`maneeshv/x-video-downloader`, private). PR not yet opened — the local `gh` login is a different GitHub account.

## Next
1. Owner: open the PR `v1-worker → main` at https://github.com/maneeshv/x-video-downloader/compare/main...v1-worker (or `gh auth login` as `maneeshv` and the agent does it).
2. Verify the cron keeps advancing `lastRun` (`docs/runbooks/deploy.md` step 10).
3. v2 (owner intent): list/search/filter UI over the `bookmarks` D1 table.

## Blocked
- Nothing agent-side.

## Done recently
- 2026-08-30 Owner confirmed playback. ADR-0010 (manual deploy, no CI), README rewritten for v1, `.env.example` added.
- 2026-08-30 Playback fixed: `Content-Range` was `bytes NaN-NaN/size` (R2 range-object shape); `FakeR2` now mirrors R2; verified `play()` in-browser.
- 2026-08-30 `Illegal invocation` download bug fixed + regression test; branches pushed to GitHub.
- 2026-08-30 Access switched to the Cloudflare IdP; OAuth completed; first backfill indexed 354 bookmarks into D1; download-exception logging added.
- 2026-08-30 `TELEGRAM_CHAT_ID` secret set from `getUpdates`; test alert delivered to the owner's chat. All 4 secrets + 3 vars now in place.
- 2026-08-30 Access enabled on the Production workers.dev route (owner); `TEAM_DOMAIN`/`POLICY_AUD` vars and `X_CLIENT_ID`/`X_CLIENT_SECRET` secrets set; redeployed; `/status` → 302 to the Access login (verified). Runbook §4/§5/§6 updated with the real dashboard path and values.
- 2026-08-30 Final review fix wave + re-review fix: `/v/:key` 304 on If-Modified-Since, 416 only on an unsatisfiable Range (other R2 faults now propagate); `download()` refuses unknown-length bodies (ADR-0009); multi-video partial-`downloaded` rows now point `r2_key` at whichever video actually stored, not always `videos[0]`; 9 minors. `npm test` 43/43.
- 2026-08-30 Task 9 (part): R2/KV/D1 created and bound, D1 migrated, Worker deployed twice (`PUBLIC_ORIGIN` set on 2nd), `TELEGRAM_BOT_TOKEN` secret set; `docs/runbooks/deploy.md` written; `docs/ARCHITECTURE.md` rewritten as built; `docs/GOTCHAS.md` pruned; `docs/runbooks/setup-x-developer-app.md` OAuth-2.0-vs-1.0a note added.
- 2026-08-30 Task 8 review fixes: `/v/:key` 206-only-on-Range, 304 on If-None-Match, safe key decode; `test/index.test.ts` 5 tests.
- 2026-08-30 Task 8: `src/html.ts` + `src/index.ts` — routes, Access gate, OAuth PKCE flow, scheduled handler; `test/index.test.ts` 4 tests.
- 2026-08-29 Task 7 (+ 2 review-fix rounds): `src/sync.ts` — run loop, downloads, circuit breaker, alerts; `test/sync.test.ts` 12 tests.
