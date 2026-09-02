# 0017. Raise the file-size ceiling to 5 GiB
Date: 2026-09-02 | Status: DECIDED | Supersedes: ADR-0015 for the ceiling only | Evidence: owner decision 2026-09-02

## Context

The owner-adjustable operating limit remains bounded in code, but the 3 GiB ceiling is lower than the newly required maximum. The existing API, KV validation, UI, and downloader already share `MAX_FILE_BYTES` as that bound.

## Decision

Raise `MAX_FILE_BYTES` from 3 GiB to 5 GiB. Keep the 1 GiB default, 1 MiB minimum, per-run snapshot, and separate retry/backfill behavior unchanged.

## Consequences

- easier: the owner can select limits through 5 GiB without another code change.
- harder: successful large downloads can increase R2 storage and transfer costs faster.
- revisit when: a required file exceeds 5 GiB or platform upload constraints change.
