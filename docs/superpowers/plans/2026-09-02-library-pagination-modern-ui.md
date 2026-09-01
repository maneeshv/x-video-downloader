# Library pagination and modern UI implementation plan

Spec: `../specs/2026-09-02-library-pagination-modern-ui-design.md`

- [x] Add failing store and route/render tests for counts, offsets, defaults, clamping, stateful links,
      and the watch-to-library anchor.
- [x] Extend `LibraryQuery`, add `Store.countLibrary`, and make `Store.listLibrary` accept an offset.
- [x] Parse and canonicalize library state in the Worker route; count, clamp, and fetch one page.
- [x] Rework the shared HTML/CSS system and render pagination, page-size, and state-preserving links.
- [x] Keep delete navigation on the originating library state and preserve all existing watch actions.
- [x] Update architecture, product status, journal, and the URL-state ADR.
- [x] Run focused tests, full tests, typecheck, session checks, then verify desktop and mobile behavior
      in the selected browser.
