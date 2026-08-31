# Standards

Conventions for code and docs in this repo. `CLAUDE.md` links here; keep that file short and put detail here.

## Documents: roles and lifecycle
| Doc | Lifecycle | Marker allowed |
|---|---|---|
| `docs/STATUS.md` | **Overwritten** every session. Now / Next / Blocked must be true as of its `Updated:` date. | — |
| `docs/JOURNAL.md` | **Append-only**, newest entry first. | — |
| `docs/QUESTIONS.md` | Live list. A resolved question becomes an ADR (or a journal line) and is **deleted** here. | `OPEN` |
| `docs/decisions/NNNN-slug.md` | **Append-only** ADRs. Never edit a decision; write a new one that `Supersedes:` it. | `DECIDED` |
| `docs/superpowers/specs/YYYY-MM-DD-slug-design.md` | `PROPOSED` until the owner approves; then **frozen**. Superseded by a new dated spec, never edited. | `PROPOSED` / `APPROVED` |
| `docs/superpowers/plans/YYYY-MM-DD-slug.md` | Executed step by step; checkboxes ticked; STATUS links the active plan. | — |
| `docs/ARCHITECTURE.md` | **Rewritten** to match code whenever reality changes. Never patched with "now also…". | — |
| `docs/PRODUCT.md` | Slow-changing. Edit only when scope/goals change (and say so in JOURNAL). | — |
| `docs/research/YYYY-MM-DD-topic.md` | Frozen evidence with sources. Cited by ADRs and specs. | — |
| `docs/runbooks/task.md` | Carries `Last verified: YYYY-MM-DD`. Older than 90 days → re-run before trusting. | — |
| `docs/GOTCHAS.md` | **Curated and pruned.** Topic-grouped facts a session could re-trip on. Promoted from JOURNAL; deleted once code or a runbook encodes them. | — |

A marker in the wrong file is a bug (e.g. `DECIDED` outside an ADR).

**ADR vs journal line:** write an ADR if a future agent could reasonably choose otherwise and be wrong (dependencies, storage, auth, API shape, cadence). Everything else is a journal line.

**Gotchas lifecycle.** A JOURNAL "Learned / gotcha" that matters beyond its session is promoted to `docs/GOTCHAS.md` in the same session (date, fact, source, "baked into"). JOURNAL entries scroll out of the START read window; GOTCHAS does not. A line is **deleted** once code (a constant with a provenance comment, a test) or a runbook encodes it — a spec or ADR mention alone is not enough, because specs are only reread when worked on. GOTCHAS is not a memory dump: if it passes ~40 lines, prune before adding.

**One truth per fact.** "What's next" lives only in STATUS. Rationale lives only in ADRs. Facts about services live only in research docs (with URLs). Don't restate; link.

## Naming and dates
- Files: kebab-case. ADRs `NNNN-slug.md` (zero-padded, sequential). Specs/plans/research `YYYY-MM-DD-slug.md`.
- Dates: absolute ISO `YYYY-MM-DD`, always. Never "today", "recently", "last week".
- Link with relative paths. Link other memories liberally.

## Code
- TypeScript on Cloudflare Workers via `wrangler`; no web framework unless an ADR says so.
- Absolute imports only (owner preference). Configure `tsconfig` `paths` + `baseUrl` accordingly.
- Every magic string (X GraphQL queryId, bearer token, feature flags JSON, header set) lives in one file with a comment saying where it came from and how to refresh it.
- Hard limits (max requests per run, max downloads per run, max file size, storage cap) are **constants in code**, not config. See `docs/research/2026-08-29-persona-security.md`.
- No `TODO` comments. Deliberate ceilings use `// ponytail: <what and when to upgrade>`. Decisions go to QUESTIONS; work goes to STATUS.
- Never log a secret. One helper builds the auth headers; log only status codes and URL paths.
- When a check rejects on a measured value (size, count, duration, status), persist the value alongside the error — never just the label. A bare `too_large` cost a session on 2026-08-31: `download()` read `Content-Length` to refuse the file and discarded it, so `/stats` had no size to show for 52 failed rows until they were re-fetched.
- Secrets: `wrangler secret put` in prod, `.dev.vars` locally (gitignored). `wrangler.toml.example` is committed; real `wrangler.toml` is not.
- Tests: `node --test` (stdlib), one fixture per external API shape. No test framework unless an ADR says so.
- Library facts come from Context7 MCP or cited docs, not from memory.

## Templates

### ADR — `docs/decisions/NNNN-slug.md`
```
# NNNN. Title
Date: YYYY-MM-DD | Status: DECIDED | Supersedes: — | Evidence: docs/research/...
## Context
2–4 sentences: the forces.
## Decision
One paragraph, imperative.
## Consequences
- easier: …
- harder: …
- revisit when: …
```

### Journal entry — prepend to `docs/JOURNAL.md`
```
## YYYY-MM-DD — one-line summary
- Did: …
- Decided: … (or "see ADR-NNNN")
- Learned / gotcha: …
- Left undone: …
```

### STATUS — `docs/STATUS.md`
```
Updated: YYYY-MM-DD
## Now      (≤3 bullets, each linking a spec/plan)
## Next     (ordered, ≤5)
## Blocked  (bullet + link to the QUESTIONS line)
## Done recently (last 5, dated; older lives in JOURNAL)
```

### Open question — line in `docs/QUESTIONS.md`
```
- [ ] OPEN YYYY-MM-DD Q: <question>? Options: a / b. Default if unanswered: a. Blocks: <spec/plan>.
```

### Runbook — `docs/runbooks/task.md`
```
# <Task>
When: <trigger> | Last verified: YYYY-MM-DD
## Steps (numbered, copy-pasteable)
## Verify (how you know it worked)
## Rollback
```

## Anti-patterns
Two files saying "what's next" · README as knowledge base · raw session transcripts as "memory" · undated notes · editing a frozen spec to match what got built · TODOs in code · docs committed separately from the code they describe · CLAUDE.md over 80 lines · answering an owner "why?" in chat without an ADR to point at.
