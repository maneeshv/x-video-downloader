# Cinematic Shelf Implementation Plan

Date: 2026-09-11 | Execution authorized by the owner's selection of Option 1.

**Goal:** Implement the selected Library image without losing existing functionality.

**Architecture:** Reuse src/html.ts, libraryHref(), and the current form/picker scripts. Scope the rail and denser grid to the Library so Watch and Stats retain every action. Render a small static subset of official Feather SVG icons with its MIT notice; no package or network request at runtime.

**Tech stack:** Existing TypeScript Worker, native HTML/CSS, node:test.

Deployment addendum (2026-09-11, owner explicitly requested deploy): recover the live-only playback behavior before publishing. Regression was red before recovery; verify all non-HTML runtime modules and the Watch renderer exactly match the live bundle. Retain the production bindings and already-applied resume migration. Record the new version and smoke-check Access after deployment.

- [x] Add a failing navigation regression to test/index.test.ts: render a query with q, fav, two tags, sort, page=3, perPage=20; inspect Library/Favourites hrefs and active state. Both preserve non-favourite filters and reset page. Check owner/viewer links and reauthorization visibility.
- [x] Change the existing duration rendering test to assert a labelled poster badge and retained file-size/unknown-duration output. Run `node --no-warnings --test --test-name-pattern='cinematic|duration' test/index.test.ts`; confirm assertion failures before implementation.
- [x] In src/html.ts, add the static SVG subset and Library-only navigation, use `link({ fav: false, page: 1 })` / `link({ fav: true, page: 1 })`, remove the duplicate toolbar favourites link, move duration into the poster, and scope responsive rail/grid styles to the Library. Retain form names/IDs and hidden fav/tag parameters.
- [x] Run the focused tests, then `npm run check`. Fix regressions without changing Store, auth, or mutation behavior.
- [x] Render local synthetic fixtures through the production renderers; inspect desktop, tablet, phone, tag selection, and Watch return. Save screenshots and the visual comparison/limitations in design-qa.md.
- [x] Update ARCHITECTURE, JOURNAL, STATUS, and the selected-direction question; run `scripts/check-session.sh` and `git diff --check`; commit the implementation and its documentation together. Do not deploy.
