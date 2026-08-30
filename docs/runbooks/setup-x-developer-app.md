# Set up the X developer app (pay-per-use)
When: once, before first deploy; again only if the app is deleted | Last verified: 2026-08-30 (executed by the owner; OAuth 2.0 flow worked end to end)

## Steps
1. Go to https://console.x.com and sign in with the X account whose bookmarks will be archived. Accept the Developer Agreement.
2. Billing → purchase credits (no minimum; $5–10 is plenty for months). Set a **spending limit** (e.g., $10 per cycle). Auto-recharge is optional.
3. In the default pay-per-use project, create an App. Under **User authentication settings**:
   - Type: **Web App, Automated App or Bot** (confidential client).
   - App permissions: Read.
   - Callback URL: `${PUBLIC_ORIGIN}/oauth/callback` (exact match). For this deploy: `https://xrender.uk/oauth/callback` (ADR-0012; was `https://x-downloader.x-downloader.workers.dev/oauth/callback` before 2026-08-30 — replace, do not keep both).
   - Website URL: the same Worker origin.
4. Save the **Client ID** and **Client Secret** somewhere private (password manager). They go into the Worker via:
   ```
   wrangler secret put X_CLIENT_ID
   wrangler secret put X_CLIENT_SECRET
   ```

**Note (2026-08-30):** the app must supply the **OAuth 2.0 Client ID + Client Secret** from *User
authentication settings* (steps 3–4 above) — this is a separate credential pair from the app's
OAuth 1.0a "API Key and Secret" (Keys and tokens tab) and from the app-only Bearer Token. Neither
of those two can read bookmarks; only the OAuth 2.0 confidential-client flow can. `.env` in this
repo currently holds the OAuth 1.0a pair and the bearer token, not the OAuth 2.0 client — see
`docs/STATUS.md` Blocked.
5. After the Worker is deployed and Cloudflare Access is attached, open `https://<worker>/oauth/start` in a browser, log in through Access, approve the X consent screen (scopes: `bookmark.read tweet.read users.read offline.access`). The Worker stores the tokens in KV and caches your user id.

## Verify
- `https://<worker>/status` shows `auth: ok`, a user id, and a token expiry in the future.
- The next scheduled run (≤30 min) reports `api_status: 200` and a bookmark count.
- console.x.com → usage shows a handful of "Owned Reads" (or Post reads) per day, not hundreds.

## Rollback
- Revoke the app's access at https://x.com/settings/connected_apps, or delete the App in the console. Clear the `oauth` key in KV (`wrangler kv key delete`). The Worker will report `needs_reauth`.
