# 0015. Library navigation state lives in the URL
Date: 2026-09-02 | Status: DECIDED | Supersedes: — | Evidence: `docs/superpowers/specs/2026-09-02-library-pagination-modern-ui-design.md`

## Context
The original watch page linked back to bare `/`, so search, favourite, sort, scroll, and result context
were lost. Pagination reduces page length but does not by itself identify the originating page or card.
Browser history, `sessionStorage`, and server-side session state could each retain some context, but they
behave differently across direct links, refreshed tabs, and multiple open library views.

## Decision
Make the query string the single source of truth for library state: `q`, `fav`, `sort`, `page`, and
`perPage`. Carry that canonical state into every `/watch/:postId` link; rebuild Back to library from
the validated fields and add `#video-<postId>` so the browser returns the originating card to view.
Paginate in D1 with a filtered `COUNT(*)` plus `LIMIT`/`OFFSET`; default to 10 videos and allow only
10, 20, 30, or 50 per page.

## Consequences
- easier: library URLs are shareable, reloadable, safe across multiple tabs, and need no client-only
  storage; the watch page cannot become an open redirect because it reconstructs rather than accepts
  an arbitrary return URL.
- harder: each library request performs two small D1 queries, and watch URLs are longer; this is
  negligible at X's 800-bookmark ceiling (ADR-0007).
- revisit when: the reachable library grows beyond a few thousand rows, deep offsets become measurable,
  or the product gains state that is sensitive or too large for a query string.
