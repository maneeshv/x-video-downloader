Updated: 2026-09-03

## Now
- **[Library tag picker redesign](superpowers/specs/2026-09-03-library-tag-picker-design.md) is implemented and browser-verified:** the Library now has a searchable multi-tag popover with counts, disabled selected rows, draft Apply/discard, repeated URL parameters, and exact AND filtering; the watch page has the shared select-or-create combobox with staged `New` tags. Both TypeScript projects and all 73 tests pass; [design QA](../design-qa.md) passed at desktop and 390×844.
- **The basic tagging release remains live:** D1 migration `0003_tags.sql` is applied and Worker version `75a92145-80e4-474d-9992-827bb916f954` has 100% traffic on `xrender.uk`.
- **No deploy was performed for the picker upgrade.** Live source remains commit `f0749f7`; the new implementation is on branch `add-tagging-functionality-library` and needs an explicit owner deploy request under ADR-0010.

## Next
1. Owner: review the picker implementation, then explicitly approve deployment; after deploy, smoke-test reuse/create/save plus two-tag filter → watch → Back.
2. Push/review/merge branch `add-tagging-functionality-library` so `main` records the deployed source and approved follow-up design.
3. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-video-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting stale configuration.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-03 Approved Library tag picker implemented with TDD and passing desktop/mobile browser QA; not deployed.
- 2026-09-03 Library tag picker option 3 selected, specified, and approved; not implemented.
- 2026-09-03 Basic Library tagging migration and Worker version `75a92145` deployed and route-verified.
- 2026-09-02 Library sorting by largest/smallest file size merged in PR #25.
- 2026-09-02 File-size ceiling raised from 3 GiB to 5 GiB.
