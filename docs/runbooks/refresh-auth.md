# Re-authorize when X tokens are dead
When: `/status` or a Telegram alert shows `needs_reauth` (refresh token rejected, revoked app, or long idle) | Last verified: 2026-08-29 (from docs, not yet executed)

## Steps
1. Open `https://<worker>/oauth/start` in a browser (behind Cloudflare Access).
2. Approve the X consent screen.
3. That's it — tokens and user id are rewritten in KV; `paused_until` is cleared.

## Verify
- `/status` shows `auth: ok`; the next run succeeds.

## Rollback
- Nothing to roll back; re-run the steps if the consent screen errored.
