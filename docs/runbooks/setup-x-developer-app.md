# Set up the X developer app (pay-per-use)
When: once, before first deploy; again only if the app is deleted | Last verified: 2026-08-29 (from docs, not yet executed)

## Steps
1. Go to https://console.x.com and sign in with the X account whose bookmarks will be archived. Accept the Developer Agreement.
2. Billing → purchase credits (no minimum; $5–10 is plenty for months). Set a **spending limit** (e.g., $10 per cycle). Auto-recharge is optional.
3. In the default pay-per-use project, create an App. Under **User authentication settings**:
   - Type: **Web App, Automated App or Bot** (confidential client).
   - App permissions: Read.
   - Callback URL: `https://<worker-name>.<account>.workers.dev/oauth/callback` (exact match; add the custom-domain variant too if one is used later).
   - Website URL: the same Worker origin.
4. Save the **Client ID** and **Client Secret** somewhere private (password manager). They go into the Worker via:
   ```
   wrangler secret put X_CLIENT_ID
   wrangler secret put X_CLIENT_SECRET
   ```
5. After the Worker is deployed and Cloudflare Access is attached, open `https://<worker>/oauth/start` in a browser, log in through Access, approve the X consent screen (scopes: `bookmark.read tweet.read users.read offline.access`). The Worker stores the tokens in KV and caches your user id.

## Verify
- `https://<worker>/status` shows `auth: ok`, a user id, and a token expiry in the future.
- The next scheduled run (≤30 min) reports `api_status: 200` and a bookmark count.
- console.x.com → usage shows a handful of "Owned Reads" (or Post reads) per day, not hundreds.

## Rollback
- Revoke the app's access at https://x.com/settings/connected_apps, or delete the App in the console. Clear the `oauth` key in KV (`wrangler kv key delete`). The Worker will report `needs_reauth`.
