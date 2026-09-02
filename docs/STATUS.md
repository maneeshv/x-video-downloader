Updated: 2026-09-02

## Now
- **Durable private R2 posters are live in production.** All 198 eligible posters were migrated with 0 unavailable and 0 failures; Library and Watch now render Access-gated `/p/:postId` URLs from private R2.
- **Current production has Longest/Shortest duration sorting and 181/198 live downloaded rows with duration; 17 remain unavailable.** The custom domain redirects unauthenticated requests to Access and workers.dev remains disabled.
- **Last observed real account state (2026-08-31):** 190 downloaded / 0 pending / 8 `too_large` / 56 no video / 1 deleted / 35.91 GB R2.

## Next
1. Open, review, and merge the durable-poster branch.
2. Decide whether the 17 rows still unavailable from X justify a separate R2/MP4 metadata extraction path.
3. Save the desired operating file limit on `/stats` and explicitly retry/backfill old `too_large` rows if needed.
4. Verify Download and Log out once.

## Blocked
- Nothing agent-side.

## Done recently (last 5; older in JOURNAL)
- 2026-09-02 Durable private R2 posters deployed in two phases; 198/198 eligible posters migrated; Paseo verified first/last pages and Watch with zero X-CDN poster requests.
- 2026-09-02 Longest/Shortest Library duration sorting implemented, pushed, and deployed as `10f4cb53`; 75 tests pass; PR/merge pending.
- 2026-09-02 Duration repair deployed and run: 181/198 live Library rows now have duration; 17 remain unavailable. PR #27 merged.
- 2026-09-02 Library duration data flow deployed as `3c22564d`; migration applied and Paseo backfill/browser verification completed.
- 2026-09-02 Library sorting by largest/smallest file size implemented and verified on `fix/library-sort-by-size`; not deployed.
