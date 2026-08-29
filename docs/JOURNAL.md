# Journal

Append-only, newest first. Template in `docs/STANDARDS.md`.

## 2026-08-29 — Project kickoff: docs system, persona brainstorm, proposed design
- Did: `git init`; built the agent-memory doc system (`CLAUDE.md` session protocol, `docs/STANDARDS.md`, ADR-0001, `scripts/check-session.sh`, `.gitignore`); ran five parallel persona agents (Cloudflare architect, X-scraping pragmatist, lazy senior dev, security reviewer, repo designer) and saved their sourced reports under `docs/research/`; wrote `docs/PRODUCT.md` from the owner's brief; synthesized `docs/superpowers/specs/2026-08-29-x-downloader-design.md` (PROPOSED); listed Q1–Q8 in `docs/QUESTIONS.md`.
- Decided: ADR-0001 (repo docs are the memory; no separate `memory/` dir). Everything about the product itself is PROPOSED, not decided — owner approval pending.
- Learned / gotcha: (1) Official X API bookmarks are pay-per-use since 2026-02 ($0.001/read) — a legit ~$1–3/mo fallback. (2) `video.twimg.com` mp4s are fetchable anonymously (live-tested). (3) Cloudflare Queues and Workflows now have Free tiers, but v1 doesn't need them. (4) Workers Free CPU cap is 10 ms/invocation — streaming should be I/O-wait, but must be spiked. (5) Browser Run (ex-Browser Rendering) Free is 10 min/day; headless login is strictly worse than cookies. (6) Nitter is dead (C&D 2026-08-24). (7) The sandbox blocked `git init`; it was run with the sandbox disabled once.
- Left undone: no product code (by owner instruction). Spikes S1/S2 not run. No runbooks yet (nothing to run). Stop-hook wiring (Q8) not done.
