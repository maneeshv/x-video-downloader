# 0020. Store bounded Library tags as JSON in D1
Date: 2026-09-03 | Status: DECIDED | Supersedes: — | Evidence: https://developers.cloudflare.com/d1/sql-api/query-json/

## Context
The single owner needs multiple tags per saved video, tag-aware search, and an exact tag filter. The library is bounded by X's 800-bookmark ceiling, tags are owner-managed metadata, and introducing a junction table would add joins and multi-statement mutation for little benefit at this scale.

## Decision
Add a nullable `bookmarks.tags` text column containing a JSON array. Limit each video to 12 tags of 30 characters, trim input, deduplicate case-insensitively, and use SQLite `json_each` for search, exact case-insensitive filtering, and the available-tags list. Keep tag state in the existing validated Library URL query so pagination and watch-page return preserve it.

## Consequences
- easier: tag editing remains part of the existing atomic metadata update, with one additive migration and no dependency.
- harder: relational tag renames and aggregate analytics require JSON queries rather than a conventional tag table.
- revisit when: the bookmark ceiling changes materially, tag-wide editing is requested, or measured D1 query time becomes noticeable.
