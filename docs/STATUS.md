Updated: 2026-09-03

## Now
- **Library tagging is live ([ADR-0018](decisions/0018-library-tags-as-json.md)):** edit up to 12 comma-separated tags on a watch page, see tags on cards, find them through search, or apply an exact tag filter. Remote D1 migration `0003_tags.sql` is applied. Worker version `75a92145-80e4-474d-9992-827bb916f954` has 100% traffic on `xrender.uk`; Access returns 302 and workers.dev remains disabled (404).
- **Release source is commit `f0749f7` on branch `add-tagging-functionality-library`;** both TypeScript projects and all 73 tests pass.
- **Current branch base `b664765` contains merged Library size sorting (PR #25).**

## Next
1. Authenticated smoke-test adding/removing tags, free-text tag search, exact filtering, and a filtered watch → Back round trip.
2. Push/review/merge branch `add-tagging-functionality-library` so `main` records the deployed source.
3. Owner: update the main checkout's gitignored `/Users/maneesh/Developer/personal-project/x-video-downloader/wrangler.toml` to match `wrangler.toml.example` so future worktrees stop inheriting stale configuration.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-03 Library tagging migration and Worker version `75a92145` deployed and route-verified.
- 2026-09-02 Library sorting by largest/smallest file size merged in PR #25.
- 2026-09-02 File-size ceiling raised from 3 GiB to 5 GiB.
- 2026-09-02 Targeted D1 pending recovery implemented.
- 2026-09-02 Library pagination, URL-backed watch return, responsive modern UI, tests, and browser QA completed and merged in PR #21.
