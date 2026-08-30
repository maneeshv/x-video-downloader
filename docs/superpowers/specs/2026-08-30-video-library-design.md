# Video library (v2) — design
Date: 2026-08-30 | Status: **APPROVED 2026-08-30** by the owner in chat (frozen; changes go in a new dated spec) | Supersedes: nothing (extends `2026-08-29-x-downloader-design.md` §4 "index page") | Decisions: ADR-0011

## 1. Summary
Replace the v1 bare `<ul>` of videos with an Emby-style library: a poster grid with search, favourites filter and sort; a per-video watch page where the owner edits a title and description, toggles favourite, and deletes the video. Everything stays in the one Worker (ADR-0008), with no new dependency or framework (ADR-0006): four new columns on the existing `bookmarks` table, four new routes, two templates, ~40 lines of browser JS for the mutations.

Streaming security is already met and unchanged: every route, including `/v/:key`, requires a verified Cloudflare Access JWT (`src/index.ts` `handle()`, ADR-0004) and the bucket has no public URL. The `<video>` element is same-origin, so the Access cookie accompanies range requests.

## 2. Approaches considered
| # | Approach | Verdict |
|---|---|---|
| **A** | **Server-rendered HTML; query params for search/filter/sort; JSON API + vanilla `fetch()` only for mutations** | **Chosen.** Works without JS for browsing; grid and watch page are unit-testable in `node:test` like v1. |
| B | JSON API + client-side rendering (instant search-as-you-type over ≤800 rows) | Rejected: moves the UI logic into untested browser JS for no functional gain at this size. |
| C | htmx / Preact | Rejected: new dependency needs an ADR and buys nothing at 800 rows. |
| — | Emby/Jellyfin on Cloudflare Containers over an R2 FUSE mount | Rejected 2026-08-30: ephemeral disk (library DB wiped on sleep), billed while awake, no native R2 support; breaks "near-free" (`docs/PRODUCT.md`). |

## 3. Data
Migration `migrations/0002_library.sql` — `ALTER TABLE bookmarks ADD COLUMN` × 4:

| Column | Type | Meaning |
|---|---|---|
| `title` | `TEXT` | Owner-set; `NULL` → the UI falls back to the first ~60 characters of `text`. |
| `description` | `TEXT` | Owner-set free text; searched. |
| `favorite` | `INTEGER NOT NULL DEFAULT 0` | 0/1. |
| `deleted_at` | `TEXT` | ISO timestamp; non-NULL = tombstone (§5). |

No new table: `bookmarks` already has exactly one row per post, and a post is the unit the owner manages. `test/fakes.ts` `SCHEMA` must load every file in `migrations/` in name order so `FakeD1` matches production.

## 4. Store (`src/store.ts`)
- `listLibrary({ q?, fav?, sort }): Promise<BookmarkRow[]>` — `WHERE status = 'downloaded' AND deleted_at IS NULL`, plus `AND favorite = 1` when `fav`, plus `AND (title LIKE ? OR description LIKE ? OR text LIKE ?)` with `%q%` when `q` is non-empty. `sort`: `newest` (default; `posted_at DESC, post_id DESC`), `oldest`, `title` (`COALESCE(title, text) COLLATE NOCASE`). `LIMIT 500` as today. Full-text indexing is deliberately not used: ≤800 rows.
- `updateMeta(postId, { title?, description?, favorite? }): Promise<boolean>` — `UPDATE … WHERE post_id = ? AND status = 'downloaded' AND deleted_at IS NULL`; only the supplied fields change; returns whether a row matched. Empty-string `title`/`description` are stored as `NULL`.
- `markDeleted(postId, now): Promise<boolean>` — sets `deleted_at` (idempotent; leaves an already-set value alone), same `WHERE` as above minus the `deleted_at IS NULL` guard so a re-delete still returns true.
- `deleteVideos(postId): Promise<void>` — `r2.delete([\`${id}.mp4\`, \`${id}-1.mp4\`, … \`${id}-4.mp4\`])`. X allows at most 4 media per post (`src/x.ts` key scheme); R2 delete of a missing key is a no-op, so no `list()` round-trip. Also clears the ledger for sibling videos that `r2_key` doesn't name.
- `getBookmark(postId)` (exists) serves the watch page.

## 5. Delete semantics (ADR-0011)
Owner decision 2026-08-30: **delete frees the space**. `DELETE /api/videos/:id` runs `deleteVideos` then `markDeleted`, in that order — if the R2 delete throws, the row stays live and the owner retries; the tombstone is never written for a video that is still stored. Not undoable; the row stays in D1 (with `text`, `post_url`) so the owner can see what was deleted.

**Tombstone beats ledger.** ADR-0003/0007 make "key exists in R2" the download truth; a deleted video no longer exists in R2, so the cron would re-download it. `processItem()` (`src/sync.ts`) therefore returns immediately when `prev?.deleted_at` is set, before any `r2.head`. This is the one place sync changes.

## 6. Routes (`src/index.ts`)
Access JWT check stays in front of everything. The current blanket `405` for non-GET moves after the API routes.

| Route | Behaviour |
|---|---|
| `GET /?q=&fav=1&sort=newest\|oldest\|title` | Grid over `listLibrary`. Unknown `sort` → `newest`. |
| `GET /watch/:postId` | `getBookmark`; 404 unless `status = 'downloaded'` and not deleted. |
| `POST /api/videos/:postId` | Body JSON `{ title?: string, description?: string, favorite?: boolean }`. 415 unless `content-type` starts with `application/json` (a cross-site form cannot set it — CSRF defence, no token needed). 400 on unparsable body or wrong field types. 404 when `updateMeta` matched nothing. 204 on success. `title` capped at 200 chars, `description` at 2000 (413 beyond). |
| `DELETE /api/videos/:postId` | §5. 404 if the row is not `downloaded`; 204 on success, also on a repeat delete (idempotent). No body required, no content-type check (a form cannot send DELETE). |
| `/v/:key`, `/status`, `/oauth/*`, `/backfill` | Unchanged. A deleted key 404s naturally because the object is gone. |

`:postId` must match `/^\d{5,25}$/` (same digit range as `VIDEO_KEY_RE`) or 404.

## 7. UI (`src/html.ts`, no framework, no build step)
Shared: dark theme, `system-ui`, single inline `<style>`, `<meta viewport>`. Escaping via the existing `esc()` for every interpolated value; URLs additionally restricted to `https:` before being emitted as `src`/`href`.

**Grid (`/`)**
- Top bar: `<form method=get>` with search `<input name=q>`, a "★ Favourites" link that toggles `fav=1` (keeps `q`/`sort`), a `<select name=sort>` that submits on change, and the count. Existing header facts stay (last run, re-authorize link when `needs_reauth`).
- Cards: CSS grid (`repeat(auto-fill, minmax(200px, 1fr))`). Each card links to `/watch/:id`; poster = `preview_url` in a fixed 16:9 box with `object-fit: cover` (X videos are mixed aspect; cropping is accepted), grey placeholder when `preview_url` is null; below it the title (or text fallback, one line, ellipsis), the date, and a ★ badge when favourite.
- Empty state: "No videos match" with a link back to `/`.

**Watch (`/watch/:id`)**
- `<video controls autoplay playsinline src="/v/<r2_key>" poster=…>`. Multi-video posts play the first only (existing ponytail; siblings are in R2 and are deleted together).
- Form: `title` input, `description` textarea, Save button; ★ Favourite toggle; Delete button; links: original post, download (`/v/<key>` with `download`), back to grid.
- JS (~40 lines, inline): Save → `POST` JSON; ★ → `POST {favorite}`; Delete → `confirm()` then `DELETE`, then `location = "/"`. Non-2xx → `alert(status)`. Progressive enhancement is not attempted for mutations (JS required).

## 8. Error handling
- Mutations validate before touching storage; storage errors propagate as 500 (Workers logs), never swallowed.
- Delete ordering per §5 guarantees no tombstone without R2 deletion.
- Hotlinked posters can rot if X removes the media; the card then shows the browser's broken-image state. Accepted; re-hosting is the first follow-up if it happens (§10).

## 9. Testing (`node --test`, existing fakes)
- `test/store.test.ts`: `listLibrary` filters (q, fav, sort, excludes deleted), `updateMeta` partial updates + NULL-ing, `markDeleted` idempotence, `deleteVideos` removes all sibling keys. `FakeR2` gains `delete(keys)`.
- `test/sync.test.ts`: a tombstoned post whose key is absent from R2 is **not** re-downloaded and its row is untouched (the important one).
- `test/index.test.ts`: 415/400/404/413/204 paths for `POST`, 404/204/204-again for `DELETE`, `/watch` 404 for pending/deleted/unknown, grid renders titles and honours `q`/`fav`/`sort`, JWT still required on the new routes.
- `test/fakes.ts` `SCHEMA` loads both migrations.

## 10. Out of scope (add when one actually hurts)
Re-hosting thumbnails in R2; bulk actions; tags; undo / soft-delete-then-purge; removing the bookmark on X (needs `bookmark.write` scope and a re-auth); showing all videos of a multi-video post; keyboard shortcuts; pagination beyond `LIMIT 500`.

## 11. Rollout
One branch `library-ui` (from `backfill-downloads`, PR #2), one PR. Deploy: `wrangler d1 migrations apply x-downloader --remote` then `wrangler deploy` (`docs/runbooks/deploy.md` gains the migration step). Docs in the same PR: ADR-0011, ARCHITECTURE (routes, schema, sync step), PRODUCT (library now in scope, non-goal line updated), STATUS/JOURNAL.
