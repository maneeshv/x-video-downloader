# Deploy the Worker
When: first deploy, or after a code/config change needs redeploying | Last verified: 2026-08-30

`wrangler.toml` is local and gitignored (copy `wrangler.toml.example`, fill in real ids). Network
`wrangler`/`npm` calls need the Bash sandbox off (EPERM otherwise).

## Before every deploy (added 2026-08-30 after a stale-config deploy)
`wrangler.toml` is gitignored, so each git worktree carries its own copy — Paseo's bootstrap copies it from the main checkout, which may predate a config change merged from another worktree. On 2026-08-30 a worktree deployed with the pre-xrender.uk file: workers.dev came back on and `PUBLIC_ORIGIN` reverted (fixed by a redeploy 5 minutes later). So, first:
```bash
diff <(grep -v -E '^\s*(#|$)' wrangler.toml.example | grep -v -E '^(id|database_id) =') <(grep -v -E '^\s*(#|$)' wrangler.toml | grep -v -E '^(id|database_id) =')
```
Expect no output apart from the real `TEAM_DOMAIN`/`POLICY_AUD` values. Any `routes`/`PUBLIC_ORIGIN`/`[vars]` difference: copy the example's lines into `wrangler.toml` before `npx wrangler deploy`. After deploying, the printed triggers must list `xrender.uk (custom domain)` — a bare workers.dev URL means the config was stale.

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
This applies every pending file in `migrations/` (as of 2026-08-30: `0001_bookmarks.sql`,
`0002_library.sql`). Run it **before** `wrangler deploy` whenever `migrations/` changed — the new
code reads the new columns immediately, so deploying first would 500 on the first request that
touches them.

Verify:
```bash
npx wrangler d1 execute x-downloader --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```
Expect `bookmarks`, `d1_migrations` (plus sqlite/D1 internal tables).

### 3. Deploy on the custom domain (ADR-0012)
`wrangler.toml` carries `[[routes]] pattern = "xrender.uk", custom_domain = true` and
`[vars] PUBLIC_ORIGIN = "https://xrender.uk"`. The zone must be active in the same Cloudflare
account and the hostname must have no pre-existing CNAME; then:
```bash
npx wrangler deploy      # ends with: "xrender.uk (custom domain)" under "Deployed x-downloader triggers"
```
Wrangler creates the DNS record and certificate itself. Because a route exists, `workers_dev` is
inferred `false` and `https://x-downloader.x-downloader.workers.dev` returns 404 (set
`workers_dev = true` temporarily if a cutover needs both). Verify:
```bash
curl -si https://xrender.uk/status | head -1   # expect: HTTP/2 302 (to the Access login); 403 before Access is attached
```
Done 2026-08-30 (version `3fc29825-fde6-4f4e-92ab-c120497d7942`): DNS was live within seconds.
Gotcha (hit 2026-08-30): any lookup on the deploying Mac made before wrangler created the record
leaves a **negative A-record entry in mDNSResponder for the zone's SOA minimum = 1800 s (30 min)**;
`dig` (asks upstream directly) answers, but `dscacheutil -q host -a name xrender.uk` shows only AAAA,
so curl says "Could not resolve host" / hangs and Chrome (incl. the Paseo tab) lands on
`chrome-error://chromewebdata/`. Fix: `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`
(needs a password — owner), `curl --resolve xrender.uk:443:<dig answer>`, or wait 30 min. Avoid it next
time by not resolving the name before `wrangler deploy` finishes.
History: 2026-08-30 08:xx–17:xx the origin was `https://x-downloader.x-downloader.workers.dev`.

### 4. Set vars (`TEAM_DOMAIN`, `POLICY_AUD`, `PUBLIC_ORIGIN`) — done 2026-08-30 (values in step 6)
Edit `wrangler.toml` `[vars]` directly, then `npx wrangler deploy`. `PUBLIC_ORIGIN` is already set
(step 3); `TEAM_DOMAIN`/`POLICY_AUD` need Access enabled first (step 6 below).

### 5. Secrets
```bash
npx wrangler secret put X_CLIENT_ID          # done 2026-08-30, read from .env, never echoed
npx wrangler secret put X_CLIENT_SECRET      # done 2026-08-30, ditto
npx wrangler secret put TELEGRAM_BOT_TOKEN   # done 2026-08-30, read from .env, never echoed
npx wrangler secret put TELEGRAM_CHAT_ID     # done 2026-08-30 (getUpdates only shows messages <24 h old — resend if empty)
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

### 6. Enable Cloudflare Access on the Worker
(Done 2026-08-30 on the workers.dev route; the app is Worker-scoped, "All traffic", so it covered
`xrender.uk` automatically with the same AUD when the custom domain was added — verified by the
302 in step 3. Nothing to redo for a hostname change.)
Dashboard: **Workers & Pages → x-downloader → Domains tab** (older dashboards: **Settings → Domains &
Routes**) → **Production** workers.dev row → the **Enable Access →** link (leave the Preview row alone) → **Manage** / the
Worker's **Access** tab → the auto-created
policy `x-downloader - Production` → set the policy as described below. Sources: Cloudflare
changelog 2025-10-03 (one-click Access), 2025-12-03 (reusable `<worker> - Production` policy), 2026-05-14 (Domains tab).
Then **Zero Trust → Access → Applications →** the app created for this route → copy the
**Application Audience (AUD) Tag**. The team domain is `https://<team>.cloudflareaccess.com`
(shown in Zero Trust → Settings → Custom Pages, or the URL of the Zero Trust dashboard itself).
Put both into `wrangler.toml` `[vars] TEAM_DOMAIN` / `POLICY_AUD`, then `npx wrangler deploy`.
Done 2026-08-30: `TEAM_DOMAIN = "https://orange-sky-811f.cloudflareaccess.com"`,
`POLICY_AUD = "51d1e95c9f203c9af5c21913bcaf90c001acd25aa195221228229ea0f3ede47c"` (both public — they appear in the
Access login redirect — so recorded here for rebuilding `wrangler.toml`). Verified: `curl -si …/status` → `HTTP/2 302`
to `<TEAM_DOMAIN>/cdn-cgi/access/login/…?kid=<POLICY_AUD>`. In the dialog, choose Scope **All traffic** (default is
Previews only, which leaves production public). Policy as deployed: **Cloudflare account members** (Allow) — this
selector only matches logins through the **Cloudflare** identity provider, so under Zero Trust → Access controls →
Applications → `x-downloader - Cloudflare Workers` → login methods, enable **Cloudflare** and disable One-time PIN
(the Worker's quick dialog only offers *Email domain*, which would admit all of gmail.com; the full-address *Emails*
selector lives in Zero Trust → Access controls → Policies if ever needed).

### 7. X app callback URL
In console.x.com, the app's **User authentication settings** callback URL must be exactly
`${PUBLIC_ORIGIN}/oauth/callback` — for this deploy: `https://xrender.uk/oauth/callback`
(was `https://x-downloader.x-downloader.workers.dev/oauth/callback` until 2026-08-30; **owner must
update it in console.x.com after the domain switch** — until then `/oauth/start` fails at X's consent
screen, while the cron keeps working on the tokens already in KV).
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
