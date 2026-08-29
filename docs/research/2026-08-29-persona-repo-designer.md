# Research: agent-native repo design (persona: repo designer)
Date: 2026-08-29 | Source: brainstorm subagent, no external citations (patterns stable: Nygard ADRs, CLAUDE.md conventions)

Outcome: adopted nearly verbatim as the repo structure + `docs/STANDARDS.md`. Deviation: added `docs/research/` for dated persona/research reports (evidence behind ADRs).

## Proposed tree
```
CLAUDE.md, README.md
docs/PRODUCT.md, ARCHITECTURE.md, STATUS.md, QUESTIONS.md, STANDARDS.md, JOURNAL.md
docs/decisions/NNNN-slug.md     (ADRs, append-only)
docs/runbooks/*.md              (deploy, refresh-x-cookies)
docs/superpowers/specs|plans/   (frozen specs, executed plans)
```
No `memory/` dir: JOURNAL + STATUS + decisions are the memory; a second folder becomes a second, less-trusted truth.

## Key rules carried into STANDARDS.md
- STATUS overwritten each session; JOURNAL and ADRs append-only; specs frozen after approval, superseded not edited; ARCHITECTURE rewritten to match code.
- Markers: DECIDED only in ADRs, PROPOSED only in unapproved specs, OPEN only in QUESTIONS.
- ADR if a future agent could reasonably choose otherwise and be wrong; journal line for everything else.
- Code TODOs forbidden; use `ponytail:` comments for deliberate ceilings, QUESTIONS for decisions, STATUS for work.
- Enforcement: `scripts/check-session.sh` fails if code changed but JOURNAL/STATUS did not. Optional Stop hook in `.claude/settings.json` to run it.

## Anti-patterns
Two "what's next" files; README as knowledge base; raw-transcript memory dumps; undated notes; editing frozen specs; TODOs duplicating STATUS; docs committed separately from code; CLAUDE.md > 80 lines.
