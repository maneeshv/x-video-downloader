# Cinematic shelf Library

Date: 2026-09-11 | Status: APPROVED visual direction (owner: “Option 1”)

Reference: [selected first preview](../../research/assets/2026-09-10-library-redesign/01-cinematic-shelf.png).

Implement the selected Library composition in the existing server-rendered application: a 200px desktop rail, compact heading and controls, five poster columns at 1440px, and pagination beneath the collection. Preserve the charcoal/off-white/amber palette and system typography. Keep real private posters; the mock's titles, thumbnails, and counts are illustrative.

The rail contains Library, Favourites, owner-only Stats, sync time, conditional owner Re-authorize, viewer status, and Log out. Library removes only fav; Favourites sets fav=1. Both preserve search, repeated tags, sort, and page size and reset page to 1. Below 1000px the rail becomes a compact top navigation; controls wrap, the grid reduces columns, and narrow phones use one column. Every action remains reachable without horizontal overflow.

Cards retain their Watch URL and return anchor, all tag chips, title, date, file size, and favourite status. Duration moves to the poster's lower-right badge; missing duration remains explicitly unavailable. The existing tag popover/bottom sheet, seven sorts, four page sizes, summaries, empty states, and pagination semantics remain authoritative. Watch and Stats retain their existing layouts and actions, with the shared typography and control palette. No new collection, API, schema, authentication, or runtime package is required.

The [functionality contract](../../research/2026-09-10-library-redesign-preview.md) and approved [tag interaction design](2026-09-03-library-tag-picker-design.md) remain binding. Verify Favourites state preservation, owner/viewer rendering, all existing route/store tests, desktop image comparison, mobile tag sheet and Watch editor, keyboard flow, and Watch → Back state. Deployment requires separate approval (ADR-0010).
