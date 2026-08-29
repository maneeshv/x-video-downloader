# 0006. TypeScript + wrangler, no web framework, `node --test` for tests
Date: 2026-08-29 | Status: DECIDED (owner accepted default); amended 2026-08-29 — absolute imports are implemented with package.json `imports` (`#src/*` → `./src/*.ts`), not `tsconfig` `paths`, because `node --test` runs the TS natively and only resolves subpath imports; esbuild (wrangler) resolves them too | Supersedes: — | Evidence: docs/research/2026-08-29-persona-lazy-skeptic.md

## Context
Cloudflare Workers' first-class toolchain is TypeScript with `wrangler`. The Worker has four routes and one cron handler; a router framework (Hono etc.) would add a dependency for a `switch` statement. Agent-written code benefits most from flat, boring files with every magic value in one place.

## Decision
TypeScript on Workers via `wrangler`; `npm` for the Worker (owner's `uv` preference applies to any Python tooling, of which there is none planned). Files: `src/index.ts`, `src/x.ts`, `src/store.ts`, `src/limits.ts`, target ≤400 lines total. Absolute imports via `tsconfig` `paths`. Tests with Node's built-in `node --test` and checked-in fixtures of real API responses (scrubbed). No new dependency without an ADR.

## Consequences
- easier: one toolchain, no framework churn, fixtures catch API-shape drift, an agent can hold the whole codebase in context.
- harder: hand-written routing and HTML; no test-framework niceties.
- revisit when: routes exceed ~10 or the HTML page needs real interactivity.
