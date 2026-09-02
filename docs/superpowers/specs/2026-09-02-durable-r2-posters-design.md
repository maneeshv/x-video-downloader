# Durable R2 posters

Date: 2026-09-02 | Status: APPROVED (owner: "You have convinced me. ... Write a spec for it") | Supersedes: `2026-08-30-video-library-design.md` §§8 and 10 where hotlinked posters and their failure mode were accepted

## Problem

The library and watch page render X's `preview_image_url` directly from the value stored in D1.
The browser therefore requests every visible poster from `pbs.twimg.com`. If X removes an object,
changes its URL, or stops serving it, the saved video remains playable from R2 but its library image
breaks. Loading the private library also discloses those image requests to X.

## Outcome

Every available poster is copied into the existing private `VIDEOS` R2 bucket and rendered through
the authenticated Worker. Library and watch pages no longer depend on X at view time. Existing
posters are migrated from the URLs already stored in D1 before they disappear; future posters are
captured during sync. Missing or unrecoverable posters render a stable built-in placeholder rather
than a broken image.

## Object and data model

- Poster key: `posters/<postId>`, where `postId` passes the existing `POST_ID_RE` validation.
- One poster per post matches the current first-video-only library and watch UI.
- Posters use the existing private `VIDEOS` bucket. No public R2 URL, new bucket, service, or
  dependency is added.
- No D1 migration is required. The key is deterministic, so a `poster_key` column would duplicate
  state and could drift from R2.
- `bookmarks.preview_url` remains the X source URL used only by ingestion, retry, and migration. It
  is never emitted into library or watch HTML after this change.
- A present R2 object is the durable poster truth. Sync checks `head()` and the subsequent `R2.put`
  uses `onlyIf: { etagDoesNotMatch: "*" }`, so overlapping runs cannot replace an existing poster.

## Poster capture

`ensurePoster(postId, previewUrl)` performs the shared capture operation for new sync items and the
existing-library backfill:

1. Return `unavailable` when there is no source URL.
2. Return `existing` when `R2.head("posters/<postId>")` succeeds.
3. Parse the source URL and accept only `https://pbs.twimg.com/...`, with no credentials or custom
   port. Fetch with `redirect: "manual"` and reject redirects so an upstream redirect cannot turn the
   Worker into a server-side request forgery primitive.
4. Require a successful response, a positive known `Content-Length` no larger than 5 MiB, a body,
   and `Content-Type` of `image/jpeg`, `image/png`, or `image/webp` (parameters such as a charset are
   ignored for the comparison). The cap is an immutable code constant.
5. Stream the body to R2 with the upstream image type in `httpMetadata.contentType`; do not buffer
   the image in Worker memory.

Poster capture runs only for a non-deleted post that has at least one video object stored in R2. It
must also run for an already-downloaded row carrying a permanent sibling-video error; the current
early return for that error must not bypass poster repair.

A poster failure never hides, fails, or retries the video itself. Capture returns a small result
(`stored`, `existing`, `unavailable`, or `failed`), logs failures without the full source URL, and
allows sync to continue. A later explicit poster backfill can retry failures.

## Serving

Add authenticated `GET /p/:postId`:

- The existing top-level Cloudflare Access JWT verification runs before the route.
- Invalid IDs return `404` without touching R2.
- Valid IDs read `posters/<postId>` directly through the R2 binding.
- Stored objects return their R2 HTTP metadata, `ETag`, `Content-Length`,
  `X-Content-Type-Options: nosniff`, and `Cache-Control: private, max-age=31536000, immutable`.
- `If-None-Match` and `If-Modified-Since` use R2 conditional reads and return `304` when unchanged.
- Range requests are unnecessary for posters and are not implemented.
- A missing object returns a small built-in neutral SVG placeholder with `200`,
  `Content-Type: image/svg+xml`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store`.
  It never fetches or redirects to X on the request path.
- A genuine R2 read failure propagates as a server error; it is not disguised as a missing poster.

The Worker route is already served at Cloudflare's edge. The first uncached request reads private R2;
the long-lived private response cache lets the owner's browser reuse the immutable poster without
calling the Worker or R2 again. Cloudflare Cache API caching and a public R2 custom domain are not
part of this version. Edge caching may be added only if measured first-load latency warrants it;
public bucket access must not bypass Cloudflare Access.

## Rendering

- Library cards render `src="/p/<postId>"` when `preview_url` is present and retain `loading="lazy"`
  and the current display title as alt text.
- The watch page renders `poster="/p/<postId>"` when `preview_url` is present.
- Rows without `preview_url` retain the current empty poster treatment; the application does not
  invent an R2 request for a source it never observed.
- No library or watch response contains a `pbs.twimg.com` URL.

## Existing-poster migration

The existing 198 live videos are part of this effort.

Extend the authenticated `/backfill` operation with poster-only mode:
`/backfill?posters=N&after=<postId>`, where `N` is clamped to 1–30 and `after` is optional but, when
present, must pass `POST_ID_RE`. Supplying both `posters` and `downloads` is rejected as ambiguous;
calls without `posters` retain the existing video-backfill behavior.

Poster mode reads the next `N` downloaded, non-deleted D1 rows whose `preview_url` is not NULL using
`post_id > after ORDER BY post_id ASC LIMIT N`, calls `ensurePoster` for every selected row, and
returns the last processed ID as `nextAfter` (or `null` at the end). The caller passes `nextAfter` to
the next request. This client-carried keyset cursor adds no D1 or KV state and prevents permanently
missing early posters from starving later rows. The pass uses D1 rather than the current X bookmark
response so videos that were later unbookmarked from X are still included.

The JSON result reports `postersStored`, `postersExisting`, `postersUnavailable`, `posterFailures`,
and `nextAfter`. At the 30-poster ceiling, 198 candidates require approximately seven requests for
one complete pass. Re-running a pass from the beginning is safe: existing objects perform an R2
existence check but no X CDN download.

If X has already removed a historical poster, the backfill records a failure for that run and the UI
continues to serve the built-in placeholder. Generating a frame from the stored video is out of scope
until unrecoverable posters are observed and justify a media-processing dependency.

## Delete semantics

Deleting a video also deletes `posters/<postId>` in the existing R2-first delete operation. R2 accepts
multiple keys and ignores missing keys, so the deterministic poster key is appended to the current
video sibling list without another list call. The D1 tombstone is written only after the combined R2
delete succeeds, preserving the existing guarantee that deleted media is not left stored.

Poster bytes are not added to `status.totalBytes` in this version. That counter currently means video
bytes and drives video-storage alerts; mixing small image bytes into it would silently change its
meaning. R2's storage dashboard remains the source for total bucket usage.

## Failure and security rules

- Never server-fetch an arbitrary HTTPS hostname from `preview_url`; only `pbs.twimg.com` is allowed.
- Never accept URL credentials or a custom port, follow redirects, accept an unknown or zero length,
  exceed the poster cap, or store a non-allowlisted media type.
- R2 and fetch exceptions are logged and surfaced in the backfill result, not converted into video
  failure or a successful poster count.
- Poster response bodies are never cached publicly in this version.
- The placeholder is application-owned static SVG with no interpolated post data or script.
- All poster routes remain behind the same Access check as the library and videos.

## Testing

- `test/store.test.ts`: deterministic poster put/get behavior and combined video/poster deletion.
- `test/sync.test.ts`: a new downloaded video stores one poster; an existing poster is not fetched
  again; invalid host/type/length and fetch failure leave the video downloaded; downloaded rows with
  sibling errors remain poster-eligible; deleted rows make no poster call.
- `test/index.test.ts`: `/p/:postId` requires Access, rejects invalid IDs, serves image metadata and
  ETag, returns `304` for matching validators, and returns the no-store placeholder when absent.
- Rendering tests: library and watch HTML contain `/p/<postId>` and no `pbs.twimg.com` URL.
- Backfill tests: poster-only routing, rejection of mixed poster/video parameters, the 1–30 bound,
  D1 source selection, keyset continuation past failures, result counts, and idempotent completed
  rerun.
- Browser verification after production backfill: all expected posters have non-zero natural
  dimensions; network logs contain `/p/` requests and no `pbs.twimg.com` requests; navigating from a
  card to its watch page reuses the same cached poster URL.

## Rollout

1. First deploy poster capture, `/p/:postId`, combined deletion, and poster-only backfill while HTML
   still renders the existing X URLs. This keeps the visible library unchanged during migration.
2. Start with `/backfill?posters=30`; follow each returned `nextAfter` until it is `null`.
   Approximately seven requests are expected for the current 198-video library.
3. Compare eligible D1 row count with R2 poster existence counts and investigate every unavailable
   or failed row; do not declare migration complete from request count alone. Retry a full pass from
   the beginning when transient failures occurred.
4. Only after every recoverable poster is stored, deploy the library/watch rendering cutover to
   `/p/:postId`. Unrecoverable rows then receive the stable placeholder.
5. Reload the first and last library pages plus representative watch pages, then verify the browser
   network and image dimensions as described above.
6. Update `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/STATUS.md`, `docs/JOURNAL.md`, the deploy
   runbook, and add an ADR recording private durable poster storage and deterministic keys.

## Acceptance criteria

1. Newly downloaded videos capture an available X poster into `posters/<postId>` in private R2.
2. Every recoverable existing live poster is backfilled from its D1 `preview_url` before rollout is
   declared complete.
3. Library and watch HTML never emit X poster URLs and render only same-origin `/p/:postId` URLs.
4. Missing or unrecoverable posters show a stable placeholder, never a broken-image state.
5. Poster serving preserves Access authentication, correct content type, conditional requests, and
   private browser caching without exposing the R2 bucket publicly.
6. Invalid or malicious source URLs and oversized or non-image bodies are never fetched into R2.
7. Poster failures do not change video availability or status and remain safely retryable.
8. Deleting a post removes its video siblings and poster before writing the D1 tombstone.
9. A completed backfill is idempotent and production verification shows no `pbs.twimg.com` requests.
10. Typechecking, automated tests, repository checks, and a live Paseo Browser verification pass.

## Out of scope

Cloudflare Cache API edge caching, a public R2 custom domain, a second image bucket, image resizing or
transcoding, poster selection for every video in a multi-video post, video-frame extraction, queues,
Durable Objects, and a poster-specific D1 status column.
