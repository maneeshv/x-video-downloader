# Stats-page file-size limit implementation plan

Spec: `../specs/2026-09-02-stats-file-size-limit-design.md`
Decision: `../../decisions/0015-owner-adjustable-file-limit-bounded-in-code.md`

## 1. Define and test the safety boundary

- [x] In `src/limits.ts`, make the 1 GiB default and 3 GiB absolute ceiling explicit.
- [x] Update `test/limits.test.ts` to assert both constants.

## 2. Persist the effective setting

- [x] Add `Store.getMaxFileBytes()` with safe fallback behavior.
- [x] Add `Store.putMaxFileBytes()` for validated values.
- [x] Cover missing, valid, malformed, below-minimum, and over-ceiling KV states in `test/store.test.ts`.

## 3. Add the authenticated settings API and stats UI

- [x] Add `POST /api/settings/max-file-bytes` before the video API matcher.
- [x] Require a JSON body containing a safe integer between 1 MiB and 3 GiB.
- [x] Pass the effective value into `renderStats()`.
- [x] Render the MB editor, hard-ceiling hint, and inline save feedback.
- [x] Test display, valid persistence, content type, body shape, and both range boundaries in `test/index.test.ts`.

## 4. Enforce one setting snapshot per run

- [x] Read the effective setting once after the pause check in `sync()`.
- [x] Pass it through `processItem()` to `download()` instead of reading KV per file.
- [x] Prove in `test/sync.test.ts` that the run snapshots the setting and that a saved value above the 1 GiB default permits a larger file.

## 5. Make repository memory true

- [x] Update `docs/ARCHITECTURE.md` and `docs/STANDARDS.md` for the two-layer limit.
- [x] Prepend the session entry to `docs/JOURNAL.md` and rewrite `docs/STATUS.md`.
- [x] Run focused tests, `npm run check`, and review the final diff.
- [x] Commit code and docs together, push the branch, and open PR #20.
