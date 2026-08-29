# 0003. The R2 object key is the ledger; no database, queue, or workflow engine
Date: 2026-08-29 | Status: DECIDED (owner accepted default) | Supersedes: — | Evidence: docs/research/2026-08-29-persona-lazy-skeptic.md, docs/research/2026-08-29-persona-cf-architect.md

## Context
"Never download twice" and "a crashed run must not lose or duplicate a video" are the two correctness requirements. Candidates: a D1 table plus Workflows per video (Cloudflare-architect persona), or the R2 object itself as the record (lazy-senior persona). Volume is one user, ≤20 bookmarks per run, a few new videos per day.

## Decision
Object key `<tweetId>.mp4` (`<tweetId>-<n>.mp4` for multi-video posts). "Already processed" = `R2.head(key)` exists. `R2.put` is atomic, so a crash mid-upload leaves nothing and the next scheduled run retries. Tweet metadata lives in the object's `customMetadata`. A KV namespace holds only what R2 cannot express cheaply: run status, `paused_until`, the OAuth refresh token, and a skip-set of permanently failed ids. No D1, Queues, Workflows, or Durable Objects.

## Consequences
- easier: one source of truth that cannot disagree with storage; zero orchestration code; free-tier ops budget is untouched (~1k Class B ops/day).
- harder: no queryable history beyond `list()`; a permanently failed id must be recorded in KV or it is retried every run.
- revisit when: per-run volume exceeds what a 15-minute cron invocation can process, or a second consumer needs to query history.
