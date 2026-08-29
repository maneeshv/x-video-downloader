# Journal

Append-only, newest first. Template in `docs/STANDARDS.md`.

## 2026-08-29 — Owner answers: official X API chosen; spec revised; ADRs 0002–0006
- Did: owner answered Q1 = (c) official pay-per-use API, Q5 = yes, defaults for the rest. Ran a research pass on X API v2 (`docs/research/2026-08-29-x-api-v2.md`); rewrote the spec for approach B (OAuth 2.0 PKCE, rotation-safe refresh, bookmarks endpoint fields, cost table); wrote ADRs 0002–0006; cleared `docs/QUESTIONS.md`; added runbooks `setup-x-developer-app.md` and `refresh-auth.md` (from docs, not yet executed).
- Decided: ADR-0002 official API over cookies/browser; ADR-0003 R2 key as ledger; ADR-0004 Access-gated route; ADR-0005 caps + circuit breaker as constants; ADR-0006 TS + wrangler + node --test.
- Learned / gotcha: pay-per-use has no minimum spend; reads bill per returned Post with 24 h UTC dedup, so polling frequency barely matters (~$0.70/mo). Refresh tokens are single-use and rotate — persist the new pair before use, keep the previous one as fallback. `max_results=100` pagination is buggy; use ≤ 90. Avoid `author_id` expansion (possible $0.01 user-read billing). Spike S1 (Cloudflare egress vs X) is moot under approach B.
- Left undone: spec is PROPOSED pending owner review of the revision; no implementation plan yet; no product code.

## 2026-08-29 — Project kickoff: docs system, persona brainstorm, proposed design
- Did: `git init`; built the agent-memory doc system (`CLAUDE.md` session protocol, `docs/STANDARDS.md`, ADR-0001, `scripts/check-session.sh`, `.gitignore`); ran five parallel persona agents (Cloudflare architect, X-scraping pragmatist, lazy senior dev, security reviewer, repo designer) and saved their sourced reports under `docs/research/`; wrote `docs/PRODUCT.md` from the owner's brief; synthesized `docs/superpowers/specs/2026-08-29-x-downloader-design.md` (PROPOSED); listed Q1–Q8 in `docs/QUESTIONS.md`.
- Decided: ADR-0001 (repo docs are the memory; no separate `memory/` dir). Everything about the product itself is PROPOSED, not decided — owner approval pending.
- Learned / gotcha: (1) Official X API bookmarks are pay-per-use since 2026-02 ($0.001/read) — a legit ~$1–3/mo fallback. (2) `video.twimg.com` mp4s are fetchable anonymously (live-tested). (3) Cloudflare Queues and Workflows now have Free tiers, but v1 doesn't need them. (4) Workers Free CPU cap is 10 ms/invocation — streaming should be I/O-wait, but must be spiked. (5) Browser Run (ex-Browser Rendering) Free is 10 min/day; headless login is strictly worse than cookies. (6) Nitter is dead (C&D 2026-08-24). (7) The sandbox blocked `git init`; it was run with the sandbox disabled once.
- Left undone: no product code (by owner instruction). Spikes S1/S2 not run. No runbooks yet (nothing to run). Stop-hook wiring (Q8) not done.
