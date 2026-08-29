# 0001. Repo docs are the agent's memory
Date: 2026-08-29 | Status: DECIDED; amended 2026-08-29 — `docs/GOTCHAS.md` added as a single curated, pruned file (still no `memory/` directory of one-fact files; rationale in `docs/STANDARDS.md` "Gotchas lifecycle") | Supersedes: — | Evidence: docs/research/2026-08-29-persona-repo-designer.md

## Context
No human writes code here; an AI agent works across many sessions with no shared context between them. The owner requires that every decision, piece of product context, and progress marker be captured in the repo so any session can continue without re-briefing. Agent-side memory (outside the repo) is invisible to other agents, to the owner, and to anyone who clones the repo.

## Decision
The repository is the only memory. `CLAUDE.md` defines a mandatory session protocol (read STATUS, JOURNAL, QUESTIONS at start; update JOURNAL and STATUS at end). Six docs with fixed roles and lifecycles (`docs/STANDARDS.md`): STATUS (overwritten), JOURNAL (append-only), QUESTIONS (live), ADRs (append-only), specs (frozen), ARCHITECTURE (rewritten). Research reports with sources live in `docs/research/` as evidence. There is no separate `memory/` directory: it would be a second, less-trusted source of truth. `scripts/check-session.sh` enforces that code changes ship with JOURNAL/STATUS updates.

## Consequences
- easier: any session (or human) can reconstruct state from ≤4 files; decisions carry their evidence; nothing lives in one agent's head.
- harder: every session pays ~2 minutes of doc reading and writing; discipline is required to delete resolved questions and rewrite STATUS rather than append.
- revisit when: JOURNAL exceeds ~1,000 lines (split by year) or more than ~10 specs are active at once (add per-feature folders).
