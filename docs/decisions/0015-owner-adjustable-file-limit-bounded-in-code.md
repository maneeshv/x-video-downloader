# 0015. The owner-adjustable file limit is bounded by an immutable code ceiling
Date: 2026-09-02 | Status: DECIDED | Supersedes: ADR-0005 for `MAX_FILE_BYTES` only | Evidence: `docs/superpowers/specs/2026-09-02-stats-file-size-limit-design.md`

## Context

ADR-0005 made every operational cap a compile-time constant to constrain unattended agent-written code. In normal use, the owner now sees rejected file sizes on `/stats` and needs to tune the file limit iteratively; requiring a code edit and deploy for each adjustment adds work without improving the bound on a runaway download. The other request, cadence, download-count, and storage-alert limits are not part of this change.

## Decision

Keep an immutable 3 GiB maximum file size in `src/limits.ts`, but allow the owner to select an operating limit from 1 MiB through that ceiling on the Access-protected `/stats` page. Store the selected byte count in KV, default to 1 GiB when it is absent or invalid, and snapshot it once per sync/backfill run. Saving the limit must not retry rows or start downloads.

## Consequences

- easier: the owner can respond to recorded `too_large` sizes without editing or deploying code.
- easier: an application bug, malformed request, or corrupt KV value still cannot authorize a file above 3 GiB.
- harder: the effective limit is runtime state and must be shown in observability instead of inferred from the deployed commit.
- harder: changing the value during a running sync affects the next run, not the in-flight snapshot.
- revisit when: another mutable cap is repeatedly adjusted in normal operation, or different users need independent limits.
