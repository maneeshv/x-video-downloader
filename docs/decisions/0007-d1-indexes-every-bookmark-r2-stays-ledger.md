# 0007. One D1 table indexes every bookmark seen; R2 stays the download ledger
Date: 2026-08-29 | Status: DECIDED (owner requested) | Supersedes: ADR-0003 in part (the "no database" clause and the KV `failed:<id>` skip-set) | Evidence: https://developers.cloudflare.com/workers/platform/pricing/#d1 (free: 5M row reads/day, 100k row writes/day, 5 GB), https://developers.cloudflare.com/d1/reference/migrations/, https://developers.cloudflare.com/d1/worker-api/d1-database/, docs/research/2026-08-29-x-api-v2.md (800-bookmark read cap)

## Context
On 2026-08-29 the owner stated a firm future need: a UI that lists and searches downloaded videos, and a record of *all* bookmarks, including ones without video. ADR-0003 dropped non-video bookmarks entirely. The X API only returns the 800 most recent bookmarks and bills per read, so anything not recorded when first seen may be unrecoverable later. Recording from day one is the only part that cannot be retrofitted; the index over videos could have been backfilled from R2 `customMetadata` at any time.

## Decision
Add one D1 database with one table, `bookmarks` (one row per bookmark the cron has ever returned, video or not; columns: `post_id` PK, `first_seen_at`, `posted_at`, `text`, `post_url`, `has_video`, `status` ∈ {no_video, pending, downloaded, failed}, `error`, `r2_key`, `bytes`, `preview_url`, `updated_at`). Schema lives in `migrations/0001_bookmarks.sql`, applied with `wrangler d1 migrations apply`. Raw SQL through the binding — no ORM, no new dependency. **R2 `head(key)` remains the truth for "downloaded"** (atomic `put`); the D1 row is written *after* a successful `put` with an idempotent upsert, so a crash between the two heals on the next run. Every run upserts all returned bookmarks and reconciles their `status` against R2. The KV `failed:<id>` keys become `status='failed'` rows. The index page and the future search UI read from D1 only. Start with no secondary indexes; add them when a query is measurably slow.

## Consequences
- easier: the v2 list/search UI is a `SELECT`; non-video bookmarks are preserved from day one; tags/notes later are `ALTER TABLE ADD COLUMN`; permanent failures are queryable instead of opaque KV keys.
- harder: two stores to keep coherent (mitigated: R2 is authoritative, D1 is reconciled every run within the returned window); one migration file to maintain; ~30 more lines in v1.
- revisit when: rows exceed what a single table scan serves comfortably (add indexes), or a `/reconcile` route is needed for rows outside the 20-per-run window (e.g. after manual R2 deletes).
