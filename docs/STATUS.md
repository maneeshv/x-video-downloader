Updated: 2026-08-29

## Now
- Owner to review the revised spec `docs/superpowers/specs/2026-08-29-x-downloader-design.md` (official X API + D1 bookmark index per ADR-0007). On approval: flip status to APPROVED and invoke superpowers:writing-plans.

## Next
1. Write the v1 implementation plan → `docs/superpowers/plans/2026-08-29-v1-worker.md` (writing-plans skill).
2. Owner runs `docs/runbooks/setup-x-developer-app.md` steps 1–4 (console.x.com: credits, spending limit, app, Client ID/Secret) and `wrangler login`; optional Telegram bot.
3. Execute the plan (TDD): scaffold (`package.json`, `tsconfig` absolute imports, `wrangler.toml.example` with R2 + KV + D1 bindings, `.dev.vars.example`), `migrations/0001_bookmarks.sql`, `src/limits.ts`, `src/x.ts` + fixtures/tests, `src/store.ts`, `src/index.ts`; `wrangler d1 create` + `migrations apply`; deploy; attach Access; `/oauth/start`; backfill once.
4. Runbooks after first deploy: `deploy.md` (incl. D1 migrations), `rclone-sync.md`; set `Last verified` on the two existing runbooks once executed.
5. Rewrite `docs/ARCHITECTURE.md` to match the built system.
6. v2 (later, owner intent): list/search/filter UI over the `bookmarks` table.

## Blocked
- Step 1 waits for the owner's "approved" on the revised spec (or change requests).
- Step 3's deploy/OAuth steps need the owner's X app credentials (step 2).

## Done recently
- 2026-08-29 Owner asked for a bookmark index + future search UI → ADR-0007 (D1 table `bookmarks`, R2 stays the ledger); spec revised again.
- 2026-08-29 Installed the Cloudflare Claude Code plugin (skills + 5 MCP servers, user scope); owner to run `/reload-plugins`.
- 2026-08-29 Owner decided: official X API (Q1 = c), Workers Paid OK if needed (Q5), defaults for Q2–Q8 → ADRs 0002–0006.
- 2026-08-29 X API v2 research; spec revised to approach B; runbooks `setup-x-developer-app.md`, `refresh-auth.md`.
- 2026-08-29 Repo scaffold, docs-as-memory system, five-persona brainstorm, initial spec.
