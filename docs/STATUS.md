Updated: 2026-08-29

## Now
- Owner to review the revised spec `docs/superpowers/specs/2026-08-29-x-downloader-design.md` (rewritten for the official X API after Q1 = c). On approval: flip status to APPROVED and invoke superpowers:writing-plans.

## Next
1. Write the v1 implementation plan → `docs/superpowers/plans/2026-08-29-v1-worker.md` (writing-plans skill).
2. Owner runs `docs/runbooks/setup-x-developer-app.md` steps 1–4 (console.x.com: credits, spending limit, app, Client ID/Secret) and `wrangler login`; optional Telegram bot.
3. Execute the plan (TDD): scaffold (`package.json`, `tsconfig` absolute imports, `wrangler.toml.example`, `.dev.vars.example`), `src/limits.ts`, `src/x.ts` + fixtures/tests, `src/store.ts`, `src/index.ts`; deploy; attach Access; `/oauth/start`; backfill once.
4. Runbooks after first deploy: `deploy.md`, `rclone-sync.md`; set `Last verified` on the two existing runbooks once executed.
5. Rewrite `docs/ARCHITECTURE.md` to match the built system.

## Blocked
- Step 1 waits for the owner's "approved" on the revised spec (or change requests).
- Step 3's deploy/OAuth steps need the owner's X app credentials (step 2).

## Done recently
- 2026-08-29 Owner decided: official X API (Q1 = c), Workers Paid OK if needed (Q5), defaults for Q2–Q8 → ADRs 0002–0006.
- 2026-08-29 X API v2 research (`docs/research/2026-08-29-x-api-v2.md`); spec revised to approach B; runbooks `setup-x-developer-app.md`, `refresh-auth.md`.
- 2026-08-29 Repo scaffold, docs-as-memory system, five-persona brainstorm, initial spec.
