# 0011. Library metadata lives in D1; a delete tombstone overrides the R2 ledger
Date: 2026-08-30 | Status: DECIDED (owner chose "delete frees the space") | Supersedes: — (amends ADR-0003/0007: R2 remains the download ledger except for tombstoned rows) | Evidence: docs/superpowers/specs/2026-08-30-video-library-design.md §3–§5

## Context
The owner wants to title, describe, favourite, search and delete downloaded videos. ADR-0003 makes "key exists in R2" the download truth, so removing an object from R2 makes the cron re-download it on the next run. Storage is the binding constraint (10 GB free tier ≈ 100 real-account videos at the observed ~98 MB average), so "delete" must actually free R2. Candidates: hide-only (keeps paying for storage), a separate `videos`/`meta` table (a second row per post for no reason), or columns on the existing one-row-per-post `bookmarks` table.

## Decision
Add `title`, `description`, `favorite`, `deleted_at` to `bookmarks` (migration 0002); sync never writes them. `DELETE /api/videos/:id` removes every R2 key of the post first, then sets `deleted_at`; `processItem()` returns before touching R2 when `deleted_at` is set. So: R2 is the ledger for everything the owner has not deleted; the D1 tombstone wins for everything they have. Search is `LIKE` over title/description/text; no FTS. Metadata is owner-only data and is not mirrored into R2 `customMetadata`.

## Consequences
- easier: one table, one row per post; delete really frees space; the cron cannot resurrect a deleted video; the row keeps `text`/`post_url` so the owner can see what was deleted.
- harder: not undoable (the object is gone); a `deleted_at` row is a permanent skip — un-deleting means clearing the column by hand (`wrangler d1 execute`) and letting the cron re-download; a bookmark re-added on X after deletion stays skipped.
- revisit when: the owner asks for undo (add a "hidden" state before purge), the library outgrows `LIKE` (FTS5), or metadata must survive a D1 wipe (mirror into R2 `customMetadata`).
