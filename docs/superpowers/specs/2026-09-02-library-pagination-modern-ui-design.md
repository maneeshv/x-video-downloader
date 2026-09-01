# Library pagination and modern UI

Date: 2026-09-02 | Status: APPROVED

## Problem

Opening a video and using the watch page's Library link always returns to `/`, losing the active
search/filter/sort state and placing the owner at the top of a potentially long grid. The library
also presents every matching video at once and its compact, heavily chromed controls no longer feel
as polished as the media collection they operate.

## Outcome

The owner can browse the library in pages of 10 videos by default, choose 10, 20, 30, or 50 videos
per page, open a video, and return to the same filtered page with the originating card brought back
into view. The library, watch page, and stats page share a restrained, contemporary visual system
without adding a framework or runtime dependency.

## State model

The URL is the source of truth for library state:

- `q`: trimmed search query.
- `fav=1`: favourites-only filter.
- `sort=newest|oldest|title`: sort order; unknown values become `newest`.
- `page`: positive one-based page number; omitted on page 1 and clamped to the last available page.
- `perPage=10|20|30|50`: page size; unknown values become 10 and the default is omitted.

Changing search, favourites, sort, or page size resets the page to 1. Pagination links preserve all
other active state. Each card carries the current state into `/watch/:postId`; the watch page rebuilds
a canonical library link and appends `#video-<postId>`. This avoids client-only storage, open redirects,
and stale hidden state while making browser history and copied URLs predictable.

## Data access

`Store.countLibrary(query)` counts all live downloaded rows matching search/favourite filters.
`Store.listLibrary(query, limit, offset)` returns only the requested window using the existing safe
sort allow-list. The route counts first, clamps the requested page, then fetches the page window.
No migration is required.

## Interface

### Visual thesis

A quiet cinematic archive: near-black charcoal surfaces, warm amber as the single accent, large real
video imagery, editorial type hierarchy, and enough negative space for a personal library to feel
curated rather than administrative.

### Content plan

- App bar: product identity, collection health, Stats, and Log out.
- Library heading: current scope and total matching video count.
- Control row: search, sort, favourites, and page size as one compact operating surface.
- Media grid: poster-led video links with title, date, size, and a text favourite badge.
- Pagination: visible result range, previous/next links, and nearby page numbers.
- Watch page: state-preserving Back to library action, player, metadata editor, and source details.
- Stats page: the existing operational information restyled within the same system; behavior unchanged.

### Interaction thesis

- A short opacity/translate entrance establishes hierarchy when a page loads.
- Video posters lift and crop in slightly on hover/focus so the whole tile reads as the interaction.
- Controls and pagination use fast color/border transitions and strong `:focus-visible` rings.
- All non-essential movement is disabled by `prefers-reduced-motion`.

## Responsive and accessibility behavior

- Controls stack cleanly on narrow screens; tap targets remain at least 40px tall.
- The grid adapts from one column to as many as fit without shrinking posters below a useful width.
- Pagination wraps without horizontal overflow.
- Inputs have explicit labels (visually hidden where appropriate), the active page uses
  `aria-current="page"`, navigation has an accessible label, and status/favourite state is expressed
  in text rather than color alone.
- Poster images use the video's display title as alt text and retain lazy loading.

## Acceptance criteria

1. `/` renders at most 10 videos by default and reports the full matching count.
2. `perPage` supports 10, 20, 30, and 50; invalid values safely fall back to 10.
3. Search, favourite, sort, page, and page-size state survive pagination and the watch round trip.
4. Back to library returns to the originating page and targets the originating card.
5. An out-of-range page is clamped rather than producing a misleading empty state.
6. Empty filtered results remain useful and can be reset.
7. Existing watch metadata, favourite, delete, download, stats, auth, and sync behavior is unchanged.
8. Automated tests, typechecking, repository session checks, and a responsive browser pass are green.
