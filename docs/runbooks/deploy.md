# Deploy the Worker
When: first deploy, or after a code/config change needs redeploying | Last verified: 2026-08-30

`wrangler.toml` is local and gitignored (copy `wrangler.toml.example`, fill in real ids). Network
`wrangler`/`npm` calls need the Bash sandbox off (EPERM otherwise).

## Steps executed 2026-08-30 (agent, Task 9 part)

### 1. Create resources (once)
```bash
npx wrangler r2 bucket create x-downloader-videos
npx wrangler kv namespace create KV            # paste the returned "id" into wrangler.toml [[kv_namespaces]]
npx wrangler d1 create x-downloader             # paste the returned "database_id" into wrangler.toml [[d1_databases]]
```
If a resource already exists, reuse it instead of recreating:
```bash
npx wrangler r2 bucket list
npx wrangler kv namespace list
npx wrangler d1 list
```
Resource ids created 2026-08-30 (not secrets, safe to record):
- R2 bucket: `x-downloader-videos`
- KV namespace id: `8881b4cf4a9c43ab9eba7351c09be8f7`
- D1 database: `x-downloader`, id `39ad612c-fad7-4fbe-b6c4-23cfbfddeed3` (region APAC)

### 2. Apply the D1 migration
```bash
npx wrangler d1 migrations apply x-downloader --remote   # answer yes if prompted
```
Verify:
```bash
npx wrangler d1 execute x-downloader --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```
Expect `bookmarks`, `d1_migrations` (plus sqlite/D1 internal tables).

### 3. Deploy, then set `PUBLIC_ORIGIN` and redeploy
```bash
npx wrangler deploy      # prints https://x-downloader.<subdomain>.workers.dev
```
Copy the printed URL into `wrangler.toml` `[vars] PUBLIC_ORIGIN`, then:
```bash
npx wrangler deploy
```
Verify (Access not attached yet, so every route 403s — this is expected and safe):
```bash
curl -si https://x-downloader.<subdomain>.workers.dev/status | head -1   # expect: HTTP/2 403
```
Origin deployed 2026-08-30: `https://x-downloader.x-downloader.workers.dev`
(the account's workers.dev subdomain is `x-downloader`, same as the Worker name — first deploy
printed a "register a workers.dev subdomain" warning that resolved itself; DNS/TLS took ~1 minute
to propagate before the origin answered.)

### 4. Set vars (`TEAM_DOMAIN`, `POLICY_AUD`, `PUBLIC_ORIGIN`) — owner step, needs Access (step 6)
Edit `wrangler.toml` `[vars]` directly, then `npx wrangler deploy`. `PUBLIC_ORIGIN` is already set
(step 3); `TEAM_DOMAIN`/`POLICY_AUD` need Access enabled first (step 6 below).

### 5. Secrets
```bash
npx wrangler secret put X_CLIENT_ID          # from the X app's User authentication settings (owner)
npx wrangler secret put X_CLIENT_SECRET      # ditto (owner)
npx wrangler secret put TELEGRAM_BOT_TOKEN   # done 2026-08-30, read from .env, never echoed
npx wrangler secret put TELEGRAM_CHAT_ID     # needs getUpdates first, see below (owner)
```
Read a secret value from `.env` without ever printing it:
```bash
sed -n 's/^SECRET_NAME=//p' .env | tr -d '"'"'"' ' | npx wrangler secret put SECRET_NAME
```
Verify names only (never values):
```bash
npx wrangler secret list
```
Done 2026-08-30: `TELEGRAM_BOT_TOKEN`. Remaining (owner-blocked, see `docs/STATUS.md`):
`X_CLIENT_ID`, `X_CLIENT_SECRET`, `TELEGRAM_CHAT_ID`.

## Owner steps (not run 2026-08-30)

### 6. Enable Cloudflare Access on the workers.dev route
Dashboard: **Workers & Pages → x-downloader → Domains tab** (older dashboards: **Settings → Domains &
Routes**) → **Production** workers.dev row → the **Enable Access →** link (leave the Preview row alone) → **Manage** / the
Worker's **Access** tab → the auto-created
policy `x-downloader - Production` → allow only the owner's email (one-time PIN login). Sources: Cloudflare
changelog 2025-10-03 (one-click Access), 2025-12-03 (reusable `<worker> - Production` policy), 2026-05-14 (Domains tab).
Then **Zero Trust → Access → Applications →** the app created for this route → copy the
**Application Audience (AUD) Tag**. The team domain is `https://<team>.cloudflareaccess.com`
(shown in Zero Trust → Settings → Custom Pages, or the URL of the Zero Trust dashboard itself).
Put both into `wrangler.toml` `[vars] TEAM_DOMAIN` / `POLICY_AUD`, then `npx wrangler deploy`.

### 7. X app callback URL
In console.x.com, the app's **User authentication settings** callback URL must be exactly
`${PUBLIC_ORIGIN}/oauth/callback` — for this deploy: `https://x-downloader.x-downloader.workers.dev/oauth/callback`.
See `docs/runbooks/setup-x-developer-app.md` for the full app-creation steps (needs the OAuth 2.0
Client ID/Secret, not the OAuth 1.0a keys already in `.env`).

### 8. Get `TELEGRAM_CHAT_ID`
Send any message to the bot from the Telegram account that should receive alerts, then:
```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```
Read `message.chat.id` from the JSON response. Feed it to `wrangler secret put TELEGRAM_CHAT_ID`.

### 9. Authorize + backfill
Open `${PUBLIC_ORIGIN}/oauth/start` in a browser (logs in through Access, then the X consent
screen). `${PUBLIC_ORIGIN}/status` should then show `auth: "ok"`. Open `${PUBLIC_ORIGIN}/backfill`
once — expect JSON with `pages`, `seen`, `downloaded`. Open `${PUBLIC_ORIGIN}/` and confirm a video
plays.

If the JSON shows `seen > 0` and `downloaded == 0` (and `/status` `counts.failed` is 0), the field
parameter may have been renamed: change `tweet.fields` to `post.fields` in `BOOKMARK_QUERY`
(`src/limits.ts`), redeploy, re-run `/backfill`. See `docs/research/2026-08-29-x-api-v2.md`.

### 10. Verify the cron
After ≤30 minutes, dashboard → Worker → **Cron Events** shows a successful invocation, and
`${PUBLIC_ORIGIN}/status` `lastRun` has advanced. Check console.x.com → usage: a handful of reads
per day, not hundreds (spec assumption; see `docs/GOTCHAS.md` "Owned Reads" line if the count is
surprising).

## Rollback
- Bad deploy: `npx wrangler deployments list` then `npx wrangler rollback [--version-id <id>]`.
- Bad migration: D1 migrations are additive-only in this repo (no down-migrations written yet); fix
  forward with a new numbered migration file.
- Compromised secret: `npx wrangler secret put <NAME>` with a new value overwrites in place; revoke
  the old value at the source (X app / Telegram BotFather) too.
- Stop the service entirely: `npx wrangler deployments list` → deploy an earlier version id, or
  delete the cron trigger by removing `[triggers]` from `wrangler.toml` and redeploying.
