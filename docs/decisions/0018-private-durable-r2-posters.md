# 0018. Store durable posters under deterministic keys in private R2
Date: 2026-09-02 | Status: DECIDED | Supersedes: — | Evidence: `docs/superpowers/specs/2026-09-02-durable-r2-posters-design.md`

## Context

Library and watch pages hotlink X's `preview_image_url`, so an X deletion or URL change breaks the image for a video that remains playable from R2. Those browser requests also disclose views of the private library to X. The current private R2 bucket and Access-gated Worker already provide the required durable storage and authorization boundary.

## Decision

Copy the available first poster for each saved post into the existing private R2 bucket as `posters/<postId>`, without a D1 key column. Conditional `R2.put` (`etagDoesNotMatch: "*"`) makes the object write-once even when runs overlap. Capture and migration may fetch only bounded, allowlisted `pbs.twimg.com` images; views use only authenticated `/p/:postId`, with private immutable browser caching and an application-owned placeholder for missing objects. Keep the bucket private, retain `preview_url` only as a repair source, and delete the deterministic poster key with the post's video objects.

## Consequences

- easier: saved videos no longer depend on X's CDN at view time; storage, authorization, idempotency, and deletion reuse existing paths.
- harder: rollout requires copying every recoverable historical poster before changing rendered URLs, and unrecoverable posters use a placeholder.
- revisit when: measured first-load latency justifies Access-safe edge caching, or observed missing posters justify extracting frames from stored videos.
