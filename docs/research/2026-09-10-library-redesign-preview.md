# Video library visual exploration

Date: 2026-09-10 | Status: EXPLORATION — no direction approved

The owner requested a reimagined video library without losing functionality and required imagegen previews before code changes. Three independent previews were generated with the built-in imagegen tool, grounded in the repository's desktop implementation screenshot and the current source at `fd93d1b`. The mobile implementation screenshot was inspected for the existing tag sheet behavior. Production was not accessed.

## Previews

Numbers follow the order the generated images appeared in the conversation.

1. [Cinematic shelf](assets/2026-09-10-library-redesign/01-cinematic-shelf.png): dark poster grid, slim navigation rail, ten visible videos. Recommended starting point for browsing by imagery; the rail would need a compact mobile adaptation.
2. [Editorial gallery](assets/2026-09-10-library-redesign/02-editorial-gallery.png): warm light surface, two columns of horizontal media entries, greater space for titles. This explores a new palette, not a theme-switching feature.
3. [Precision archive](assets/2026-09-10-library-redesign/03-precision-archive.png): compact dark list with aligned metadata and an open tag picker. Prioritizes scanning and filtering over poster size.

[Exact generation prompts](2026-09-10-library-redesign-prompts.md). Requested viewport: 1440×1024. Actual raster dimensions should be treated as imagegen output, not layout measurements.

All counts, dates, thumbnails, and titles are illustrative. Images are visual concepts, not functional verification or approved specifications. The editorial mock adds a selected-tag count without a matching result summary; a selected implementation must derive both from the same committed URL state. The precision mock repeats the favourites filter in navigation and the toolbar; select one accessible placement in the approved design. These illustration details do not redefine existing behavior.

## Functionality preservation contract

Source: [current renderer](../../src/html.ts), [URL-state design](../superpowers/specs/2026-09-02-library-pagination-modern-ui-design.md), [tag picker design](../superpowers/specs/2026-09-03-library-tag-picker-design.md).

| Existing capability | Required in any selected redesign |
|---|---|
| Search | Title, description, tags, and original post text; explicit submission and useful empty results. |
| Favourites filter | Same filter semantics; it may be relocated into navigation while preserving other URL state. |
| Tag filtering | Searchable shared vocabulary with counts; case-insensitive exact AND matching; removable draft chips; disabled selected rows; Clear/Apply; dismiss without applying; no duplicate selections. |
| Sorting | Newest, Oldest, Title, Largest, Smallest, Longest, Shortest. Keep the unresolved Largest/Smallest naming question open. |
| Pagination | Default 10; sizes 10/20/30/50; matching count/range; Previous/Next and numbered pages; correct clamping and reset behavior. |
| Video entries | Same-origin private poster or fallback, display-title fallback, date, file size, duration or unavailable state, informational tags, favourite indicator, full entry as play target. |
| Watch round trip | Preserve search, favourites, every tag, sorting, page size, page number, and return to the originating entry. |
| Watch and downloads | Existing player controls, autoplay/playsinline behavior, fullscreen and Range playback, Download file, Original post, original post text and metadata. |
| Owner editing | Title/description, existing-tag selection and new-tag staging, limits and canonical casing, Save details with retained draft on error, favourite toggle, confirmed deletion. No move of destructive actions onto library entries. |
| App and operations | Product identity, last-sync timestamp, Stats, Log out, conditional Re-authorize. Preserve all Stats functionality, including retry, retry-all, backfill, health and file-size limit controls. |
| Viewer access | View-only labeling and read-only library/watch/download capability; existing owner-only routes and mutations remain restricted. |
| Responsive/accessibility | Mobile layouts, tag bottom sheet, reachable controls, labels, focus management, keyboard tag interactions, status announcements, reduced motion, no horizontal overflow. |

No upload, playlist, collection, AI, bulk-action, sharing, or watch-history feature is proposed. Navigation labels in the previews represent existing routes or filters.

No source, test, dependency, schema, config, authorization policy, or production state was changed. A raster cannot prove functional preservation; implementation would require an approved design/plan and regression verification.

