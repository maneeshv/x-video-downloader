# Gotchas

Curated, topic-grouped facts a future session could re-trip on. Not a log: JOURNAL is the log. Rules in `docs/STANDARDS.md` ("Gotchas lifecycle"). Each line: date learned, the fact, source, and where it is baked in (or "not yet"). Delete a line once code or a runbook encodes it.

## X API v2
- 2026-08-29: Bookmarks endpoint returns only the **800 most recent** bookmarks and every read is billed — anything not recorded when first seen may be unrecoverable. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: ADR-0007; `src/limits.ts` (`BACKFILL_MAX_ITEMS`).
- 2026-08-29: Reads are deduplicated per 24 h UTC day per Post, so polling cadence barely affects cost (≈ $0.70/mo). The cheaper "Owned Reads" rate may **not** yet apply to bookmarks ($0.005 instead of $0.001) — check the first console usage report. Source: `docs/research/2026-08-29-x-api-v2.md`. Baked into: spec §6/§9; not verified in production yet.

## X media
- 2026-08-29: `video.twimg.com/*.mp4` URLs are fetchable **anonymously** (no auth), expose `Content-Length` and `Accept-Ranges`. Live-tested with curl. Source: `docs/research/2026-08-29-persona-x-scraper.md`. Baked into: `src/sync.ts` `download()` relies on it; not commented in code.
- 2026-08-29: `animated_gif` media variants shape is unverified; parser must tolerate absence. Source: spec §9. Baked into: not yet — watch `src/x.ts` `parseBookmarks`/`selectVariant` if a real `animated_gif` bookmark ever misparses.

## Cloudflare
- 2026-08-29: Workers **Free** plan CPU cap is **10 ms per invocation**. Streaming `fetch → R2.put` should be I/O-wait, but it is unspiked; Error 1102 means move to Workers Paid (owner approved, Q5). Source: https://developers.cloudflare.com/workers/platform/limits/#cpu-time. Baked into: spec §6/§9, ADR-0008; not verified against a real large download yet.
- 2026-08-29: The `cloudflare-docs` MCP (no auth) is a valid source for hard rule 5 alongside Context7. Baked into: `CLAUDE.md` rule 5.

## Tooling (Claude Code on this repo)
- 2026-08-30: `node --test` shares one module graph per test FILE, so module-level caches (e.g. the JWKS cache in src/access.ts) persist across test() blocks — use distinct cache keys (random `kid`/team domain) per test. Baked into: test/index.test.ts, test/access.test.ts.
- 2026-08-30 Workers `fetch` throws `Illegal invocation` when called as a method of another object (`deps.fetch(url)`); wrap it in an arrow. Baked into: `src/index.ts` `deps()` comment + `test/index.test.ts` bound-`this` assertion — delete this line once you trust the test.
