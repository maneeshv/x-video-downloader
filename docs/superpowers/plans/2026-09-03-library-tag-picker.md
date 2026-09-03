# Library tag picker implementation plan

Spec: `../specs/2026-09-03-library-tag-picker-design.md`

- [x] Add failing Store tests for canonical tag counts and exact case-insensitive AND filtering.
- [x] Add failing route/render tests for repeated tag parameters, URL-state preservation, picker structure, and canonical metadata saves.
- [x] Extend `LibraryQuery`, tag discovery, Store filtering, and API canonicalization without a migration or dependency.
- [x] Replace the Library single-select with the staged `Tags N` popover, including searchable rows, disabled selected states, chips, Clear, Apply, dismiss, and mobile sheet behavior.
- [x] Replace the watch comma field with the reusable select-or-create combobox, including limits, create-on-Enter, duplicate prevention, staged `New` chips, save/failure behavior, and keyboard support.
- [x] Run focused tests, full tests, typecheck, and repository session checks.
- [x] Verify desktop and 390×844 pointer/keyboard flows in the browser, compare against the selected mock, and record `design-qa.md` with a passing result.
- [x] Update architecture, product status, and journal; leave the approved specification frozen and commit the completed work.
