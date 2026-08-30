# 0009. Refuse unknown-length video bodies instead of buffering them
Date: 2026-08-30 | Status: DECIDED | Supersedes: spec §5 buffering clause | Evidence: final review 2026-08-30, https://developers.cloudflare.com/workers/platform/limits/#memory (128 MB isolate), docs/research/2026-08-29-x-api-v2.md (Content-Length verified)

## Context
Spec §5 said to buffer unknown-length video response bodies into memory (up to 100 MB) before storing them, since `R2.put` needs a known length for a stream. A Workers isolate has a 128 MB memory limit; buffering a body up to 100 MB, plus the R2 write path's own copy, risks exceeding it — and the buffering branch had to materialise the whole body before it could even check the size against that cap, so the guard it existed for ran too late to prevent the worst case. `video.twimg.com` responses have been verified to carry `Content-Length` in practice, so an unknown-length body is an edge case, not the common path.

## Decision
`download()` (`src/sync.ts`) refuses a video response with a missing or zero `Content-Length` outright — `{ ok: false, status: "failed", error: "no_length" }` — without reading any of the body. `BUFFER_IF_NO_LENGTH_BYTES` is removed from `src/limits.ts`.

## Consequences
- easier: no path can OOM an isolate buffering an unbounded/undersized-cap body; the size check always runs before any byte of the body is read.
- harder: a genuinely unknown-length video (one `x.com`'s CDN legitimately doesn't size) is skipped and recorded as a permanently failed row instead of downloaded.
- revisit when: an `x.com` CDN change drops `Content-Length` in practice (then stream with a counting `TransformStream` into a multipart upload instead of buffering).
