Updated: 2026-08-30

## Now
- Deployed but dormant: `https://x-downloader.x-downloader.workers.dev` is live (R2/KV/D1 created and bound, D1 migrated, cron scheduled every 30 min), but Access is not enabled (every route currently 403s from the Worker's own JWT check with no way to pass it), there is no X OAuth 2.0 client, and no Telegram chat id — so nothing runs end to end yet. See `docs/ARCHITECTURE.md` (as built) and `docs/runbooks/deploy.md`.

## Next (owner steps, in order — then the agent finishes deploy)
1. Owner: get the **OAuth 2.0 Client ID + Client Secret** from the X app's *User authentication settings* (see `docs/runbooks/setup-x-developer-app.md`) and add to `.env` as `X_CLIENT_ID` / `X_CLIENT_SECRET`.
2. Owner: enable Cloudflare Access on the workers.dev route (dashboard) and hand the agent the **AUD tag** + team domain (`docs/runbooks/deploy.md` step 6).
3. Owner: send one message to the Telegram bot (so the agent can read `TELEGRAM_CHAT_ID` via `getUpdates`, `docs/runbooks/deploy.md` step 8).
4. Agent: set the 3 remaining secrets, set `TEAM_DOMAIN`/`POLICY_AUD` vars, redeploy, set the X app callback URL, run `/oauth/start` then `/backfill` once, verify the cron fires (`docs/runbooks/deploy.md` steps 6–10).
5. Final review + merge of branch `v1-worker` into `main`.
6. v2 (owner intent): list/search/filter UI over the `bookmarks` D1 table.

## Blocked
- `X_CLIENT_ID` / `X_CLIENT_SECRET` secrets — need the OAuth 2.0 client from the X app (owner, dashboard).
- `TEAM_DOMAIN` / `POLICY_AUD` vars — need Cloudflare Access enabled on the workers.dev route (owner, dashboard click; Access application must exist before its AUD tag can be copied).
- `TELEGRAM_CHAT_ID` secret — need one message sent to the bot from the owner's Telegram account first.

## Done recently
- 2026-08-30 Task 9 (part): R2/KV/D1 created and bound, D1 migrated, Worker deployed twice (`PUBLIC_ORIGIN` set on 2nd), `TELEGRAM_BOT_TOKEN` secret set; `docs/runbooks/deploy.md` written; `docs/ARCHITECTURE.md` rewritten as built; `docs/GOTCHAS.md` pruned; `docs/runbooks/setup-x-developer-app.md` OAuth-2.0-vs-1.0a note added.
- 2026-08-30 Task 8 review fixes: `/v/:key` 206-only-on-Range, 304 on If-None-Match, safe key decode; `test/index.test.ts` 5 tests.
- 2026-08-30 Task 8: `src/html.ts` + `src/index.ts` — routes, Access gate, OAuth PKCE flow, scheduled handler; `test/index.test.ts` 4 tests.
- 2026-08-29 Task 7 (+ 2 review-fix rounds): `src/sync.ts` — run loop, downloads, circuit breaker, alerts; `test/sync.test.ts` 12 tests.
- 2026-08-29 Task 6: `src/access.ts` — Cloudflare Access JWT verification via WebCrypto; `test/access.test.ts`.
