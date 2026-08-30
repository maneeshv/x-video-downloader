# Open questions

Owner-facing. Each line: an OPEN marker, the date asked, options, the default the agent will assume if unanswered, and what it blocks. Resolved → ADR or journal line, then delete here.

- OPEN 2026-08-30: keep `MAX_FILE_BYTES` = 200 MB (ADR-0005)? On the test account 13/156 videos were skipped as `too_large`. Options: keep; raise to N MB (more R2 storage, still inside 10 GB free tier at this volume). **Default if unanswered: keep.** Blocks: nothing — those rows stay `failed`/`too_large` and are retried only if the cap changes and the rows are reset (`docs/runbooks/reset-store.md`).
