# Stats-page file-size limit
Date: 2026-09-02 | Status: APPROVED (owner: "Spec it, plan it, Build it and raise the PR")

## Goal

Let the owner change the maximum downloadable video size from `/stats` while looking at the recorded sizes of `too_large` failures. The change must take effect without editing code or deploying, while code still imposes an immutable 3 GiB safety ceiling.

## Design

The effective limit has two layers:

- `DEFAULT_MAX_FILE_BYTES = 1 GiB` is used when no setting has been saved or the KV value is invalid.
- `MAX_FILE_BYTES = 3 GiB` is the absolute ceiling. Neither the UI, API, nor a malformed KV value can exceed it.

KV stores the owner-selected byte count at `max_file_bytes`. This is small mutable application state, like OAuth/status/pause data, and needs no D1 migration. A sync or backfill reads the effective value once at the beginning of the run and uses that snapshot for every video in that run. A setting changed during an in-flight run therefore applies to the next run.

`/stats` shows a “Download limit” control above Health: an integer MB field (the product already labels MiB-derived values as MB), the current effective limit, the 3072 MB hard maximum, a Save button, and an inline success/error message. Saving sends JSON to `POST /api/settings/max-file-bytes`; the client converts MB to bytes. The existing Access JWT check protects the route, and requiring `application/json` retains the app's cross-site form protection.

The endpoint accepts `{ "maxFileBytes": <integer bytes> }`. Values must be safe integers from 1 MiB through 3 GiB inclusive. Valid values are persisted and return `204`; malformed bodies or out-of-range values return `400`. The API does not retry failures or start a backfill. The existing per-row Retry and explicit Backfill controls preserve those separate, potentially costly actions.

## Failure handling

- Missing, non-integer, below-minimum, or over-ceiling API values are rejected without changing KV.
- Missing, malformed, below-minimum, or over-ceiling KV values fall back to 1 GiB. They are not silently clamped, so the UI exposes the safe fallback instead of legitimizing corrupted state.
- A failed KV write produces a failed request; the UI keeps the entered value and shows the HTTP status.

## Acceptance criteria

1. `/stats` displays the effective file-size limit and permits saving 1–3072 MB.
2. The setting survives requests in KV and no D1 migration is added.
3. The next cron/backfill enforces the saved value; one run uses one stable snapshot.
4. No setting or corrupt KV value permits a download larger than 3 GiB.
5. The 1 GiB behavior remains the default for existing deployments.
6. Existing Retry/Backfill behavior is unchanged and saving alone performs no download work.
7. Store, route/UI, sync, limit, typecheck, and full repository checks pass.
