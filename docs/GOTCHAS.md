# Gotchas

Curated, topic-grouped facts a future session could re-trip on. Not a log: JOURNAL is the log. Rules in `docs/STANDARDS.md` ("Gotchas lifecycle"). Each line: date learned, the fact, source, and where it is baked in (or "not yet"). Delete a line once code or a runbook encodes it.

## X API v2
- 2026-08-29: Bookmarks endpoint returns only the **800 most recent** bookmarks and every read is billed — anything not recorded when first seen may be unrecoverable. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: ADR-0007 (D1 records every bookmark); code not yet.
- 2026-08-29: **Refresh tokens are single-use** and invalidated server-side on refresh. Persist the new pair *before* using it; keep the previous refresh token as a one-shot fallback. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: spec §5; code not yet.
- 2026-08-29: `max_results=100` pagination is buggy on bookmarks; use **≤ 90**. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: spec §5 backfill; code not yet.
- 2026-08-29: Do **not** request `expansions=author_id` / `user.fields` — may bill as $0.01 user reads. Post URL `https://x.com/i/status/<id>` needs no handle. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: spec §5; code not yet.
- 2026-08-29: Reads are deduplicated per 24 h UTC day per Post, so polling cadence barely affects cost (≈ $0.70/mo). The cheaper "Owned Reads" rate may **not** yet apply to bookmarks ($0.005 instead of $0.001) — check the first console usage report. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: spec §6/§9; not verified in production yet.

## X media
- 2026-08-29: `video.twimg.com/*.mp4` URLs are fetchable **anonymously** (no auth), expose `Content-Length` and `Accept-Ranges`. Live-tested with curl. Source: `docs/research/2026-08-29-persona-x-scraper.md`. Baked into: spec §3; code not yet.
- 2026-08-29: `animated_gif` media variants shape is unverified; parser must tolerate absence. Source: spec §9. Baked into: not yet.

## Cloudflare
- 2026-08-29: Workers **Free** plan CPU cap is **10 ms per invocation**. Streaming `fetch → R2.put` should be I/O-wait, but it is unspiked; Error 1102 means move to Workers Paid (owner approved, Q5). Source: https://developers.cloudflare.com/workers/platform/limits/#cpu-time. Baked into: spec §6/§9, ADR-0008; not verified.
- 2026-08-29: The `cloudflare-docs` MCP (no auth) is a valid source for hard rule 5 alongside Context7. Baked into: `CLAUDE.md` rule 5.

## Tooling (Claude Code on this repo)
- 2026-08-29: The Bash sandbox blocks writes inside `.git` and `~/.claude/*`. `git commit`, `git init`, and `claude plugin install` each need one unsandboxed run (or `/sandbox` allow `.git`). Baked into: `docs/runbooks/agent-setup.md` step 5.
- 2026-08-29: After installing a plugin, `/reload-plugins` (or restart) before its skills/MCPs appear; authenticated MCPs OAuth on first tool use via `/mcp`. Baked into: `docs/runbooks/agent-setup.md` steps 2 and 6.
- 2026-08-30: `node --test` shares one module graph per test FILE, so module-level caches (e.g. the JWKS cache in src/access.ts) persist across test() blocks — use distinct cache keys (random `kid`/team domain) per test. Baked into: test/index.test.ts, test/access.test.ts.
