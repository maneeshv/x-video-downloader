# 0008. One Worker does both the bookmark fetch and the video downloads in the same cron run; no Queue, no second Worker
Date: 2026-08-29 | Status: DECIDED | Supersedes: — (makes explicit the "no queue" clause of ADR-0003) | Evidence: docs/research/2026-08-29-persona-lazy-skeptic.md, docs/research/2026-08-29-persona-cf-architect.md, https://developers.cloudflare.com/workers/configuration/cron-triggers/ (15-minute wall limit per scheduled invocation), https://developers.cloudflare.com/workers/platform/limits/#cpu-time (Free: 10 ms CPU; Paid: 30 s)

## Context
The owner asked (2026-08-29) whether one Worker pulls the video links on cron and a second Worker downloads them from a queue. The Cloudflare-architect persona proposed exactly that split (producer Worker → Queues → consumer Worker); the lazy-senior persona proposed a single Worker. Volume is one user, ≤20 bookmarks per run, a few new videos per day. A download is a pipe — `fetch(mp4)` → `R2.put(stream)` — that waits on the network rather than burning CPU. Cloudflare Queues has a free tier, so cost is not the deciding factor.

## Decision
A single Worker. Its `scheduled()` handler runs `sync()`: one bookmarks API call, D1 upsert of every returned item, then sequential download of at most `MAX_DOWNLOADS_PER_RUN` (5) videos not yet in R2. Anything left over waits for the next 30-minute tick; because "already downloaded" is `R2.head(key)` (ADR-0003) and every run re-scans the returned page, the remaining items *are* the queue. The same Worker's `fetch()` handler serves the index page, video streaming, and OAuth routes. No Cloudflare Queues, no second Worker, no Workflows.

## Reasoning
- A queue adds a producer, consumer, binding, retry policy, and dead-letter handling to move ~5 messages a day.
- Crash recovery already comes from R2's atomic `put` + `head` check; a queue's retry would duplicate what the next cron tick does anyway.
- 5 sequential downloads with 1–2 s jitter are far inside the 15-minute scheduled-invocation wall limit.
- Two Workers mean two deploys, two binding sets, and a shared-state story for the circuit breaker (`paused_until`).
- The Free plan's 10 ms CPU cap is the only real risk to in-run downloads, and a queue consumer would hit the same cap; the mitigation is Workers Paid (owner approved, Q5), not a queue.

## Consequences
- easier: one file, one deploy, one set of bindings; the "queue" is a five-line loop; nothing to drain or monitor.
- harder: a run that exceeds the cap leaves items for 30 minutes; a backfill of hundreds of videos takes many ticks (acceptable — `/backfill` is one-shot and resumable).
- revisit when: per-run backlog regularly exceeds what one 15-minute invocation can drain, or Error 1102 (CPU cap) appears on downloads even on Workers Paid. Then: add Cloudflare Queues with `sync()`'s existing list/download-one split as producer/consumer; the code boundary already exists.
