# x-downloader — agent instructions

Personal, near-free, fully cloud-hosted service that watches the owner's X/Twitter
bookmarks, downloads any new videos, and stores them. See `docs/PRODUCT.md`.

**No human writes code in this repo.** Every change is made by an AI agent across many
sessions. The docs are the agent's memory; keeping them true is part of every task.

## Stack facts
- Runtime: Cloudflare Workers (TypeScript, `wrangler`). See `docs/ARCHITECTURE.md`.
- Package manager: `npm` for the Worker. `uv` for any Python tooling (owner preference).
- Product code: none yet — project is in design. Do not write product code until
  `docs/STATUS.md` says a plan is approved for execution.

## Hard rules
1. Never commit secrets (X client secret, OAuth tokens, Telegram token). Secrets live in `wrangler secret` / `.dev.vars`; tokens live in KV.
2. Absolute imports only (owner preference).
3. No new dependency without an ADR in `docs/decisions/`.
4. Absolute dates (`YYYY-MM-DD`) everywhere. Never "yesterday", "recently", "now".
5. Library/API facts come from Context7 MCP or cited URLs, not memory.
6. Use the superpowers skills: brainstorming before design, writing-plans before code,
   TDD while coding, verification before claiming done.
7. Per-user agent memory (`~/.claude/...`) is not shared with teammates. It may hold only
   pointers and personal preferences. Any project fact that exists only there is a bug: move
   it into `docs/` in the same session.

## Session protocol
START (mandatory, in order):
1. Read `docs/STATUS.md` — what is in flight, what is next, what is blocked.
2. Read the top 3 entries of `docs/JOURNAL.md`.
3. Read `docs/QUESTIONS.md` — never silently re-decide an open question.
4. Read the spec/plan that STATUS points to, if working on it.
Skip PRODUCT/ARCHITECTURE unless unfamiliar or changing them.

END (before saying "done"):
1. Prepend an entry to `docs/JOURNAL.md` (template in `docs/STANDARDS.md`).
2. Rewrite `docs/STATUS.md` so Now / Next / Blocked are true as of today.
3. Non-obvious choice made → new ADR. Choice deferred → line in `docs/QUESTIONS.md`.
   Owner asks "why is it done this way?" and the answer is not already an ADR → that is a
   gap: write the ADR in the same session (context, decision, reasoning, revisit-when).
4. Commit docs in the same commit as the code they describe.
5. Run `scripts/check-session.sh` — it fails if code changed but JOURNAL/STATUS did not.

## Map
| File | Role |
|------|------|
| `docs/STATUS.md` | Single source of truth for now/next/blocked. Overwritten each session. |
| `docs/JOURNAL.md` | Append-only session log, newest first. |
| `docs/QUESTIONS.md` | Open questions for the owner. Resolved → ADR, then deleted here. |
| `docs/PRODUCT.md` | Why it exists, scope, non-goals, constraints. Slow-changing. |
| `docs/ARCHITECTURE.md` | The system as built. Rewritten when reality changes. |
| `docs/STANDARDS.md` | Code + doc conventions and templates. |
| `docs/decisions/` | ADRs. Append-only, numbered. |
| `docs/research/` | Dated research reports with sources (evidence behind ADRs). |
| `docs/runbooks/` | Recurring ops tasks (setup X app, re-auth, deploy). |
| `docs/superpowers/specs/` | Approved designs, frozen. |
| `docs/superpowers/plans/` | Implementation plans. |
