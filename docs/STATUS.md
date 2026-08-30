Updated: 2026-08-30

## Now
- **Real X account fully backfilled (2026-08-30, 10:30–12:27 UTC).** 253 bookmarks indexed (X's list exhausted, under the 800 cap): 54 no_video, ~148 downloaded, ~52 failed (mostly `too_large` > 350 MB; exact D1 counts need `wrangler login`, see Blocked). **14.56 GB in R2** — 4.5 GB over the 10 GB free tier (≈ $0.07/mo overage at $0.015/GB-month). `storage` alert fired 12:00:37 UTC (once; never re-fires unless cleared). Confirmation `/backfill?downloads=1` → 0/0.
- Real-account videos average ~100 MB (test account ~22 MB). Cron (every 30 min, 5 downloads/tick) now handles new bookmarks; `auth: ok`.
- **v1 merged to `main`** (PR #1, 2026-08-30). Work continues on short-lived branches + PRs; CI (`check`) gates them.

## Next
0. Owner: run `wrangler login` in a terminal (token expired, see Blocked). Then agent: pull the exact `failed` breakdown from D1 and decide with the owner whether the ~52 `too_large` posts matter (raise cap again vs accept).
0b. Owner: decide on R2 over the free tier — keep (≈ $0.07/mo) or trim; alert already fired, no further nagging.
1. Owner: open + merge PR `backfill-downloads` → `main` (already deployed; code = `/backfill?downloads=N`); confirm `check` is green on it (agent cannot see Actions on the private repo).
2. Verify the cron keeps advancing `lastRun` (`docs/runbooks/deploy.md` step 10).
4. v2 (owner intent): list/search/filter UI over the `bookmarks` D1 table.

## Blocked
- `wrangler` auth: token expired during a sandboxed call and could not be refreshed (GOTCHAS, Tooling). Agent cannot read KV/D1 from the CLI until the owner runs `wrangler login` interactively. `/status` and `/backfill` via the Paseo browser tab still work.

## Done recently
- 2026-08-30 Full backfill of the real account: 7 × `/backfill?downloads=30` + confirmation; 253 indexed, ~148 downloaded, 14.56 GB. Storage alert delivered.
- 2026-08-30 Owner authorized the real X account; first cron run indexed 20 / downloaded 5 (722 MB), 0 failed.
- 2026-08-30 GitHub Actions `check` workflow (typecheck + tests on PRs); ADR-0010 amended.
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
