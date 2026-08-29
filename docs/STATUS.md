Updated: 2026-08-29

## Now
- Design review: owner to read `docs/superpowers/specs/2026-08-29-x-downloader-design.md` and answer `docs/QUESTIONS.md` (Q1–Q8). No product code until the spec is APPROVED.

## Next
1. Fold owner answers into the spec; flip status to APPROVED; write ADRs 0002–0006 (`docs/decisions/`).
2. Spike S1 (does X accept Bookmarks calls from Cloudflare egress?) and S2 (stream a large mp4 into R2 under the Free CPU cap). Throwaway code; record results in `docs/research/`.
3. If S1 passes: invoke superpowers:writing-plans → `docs/superpowers/plans/` for the v1 Worker. If S1 fails: revise spec to approach B (official pay-per-use API) and re-review.
4. Runbooks: `deploy.md`, `refresh-x-cookies.md`, `rclone-sync.md`.
5. `wrangler.toml.example`, `package.json`, `tsconfig.json` (absolute imports), `.dev.vars.example`.

## Blocked
- Everything under Next is blocked on the owner's answers to `docs/QUESTIONS.md` (Q1 and Q5 are the material ones; the rest have safe defaults).

## Done recently
- 2026-08-29 Repo scaffold + docs-as-memory system (`CLAUDE.md`, `docs/STANDARDS.md`, ADR-0001, `scripts/check-session.sh`).
- 2026-08-29 Five-persona brainstorm with sourced research → `docs/research/`.
- 2026-08-29 Design spec written (PROPOSED).
