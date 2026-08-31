# 0005. Hard caps and a circuit breaker are constants in code, not configuration
Date: 2026-08-29 | Status: DECIDED (owner accepted default) | Supersedes: — | Evidence: docs/research/2026-08-29-persona-security.md ; amended 2026-08-30 — the storage constant is named STORAGE_ALERT_BYTES in code (spec §5), not MAX_TOTAL_BYTES ; amended 2026-08-31 — storage alert re-fires per `STORAGE_ALERT_STEP_BYTES` step

## Context
All code here is written by an agent iterating without a human in the loop. A bug that loops on the X API or downloads without bound turns into an API bill, a storage bill, or a rate-limit lock. Cloudflare budget alerts are informational only.

## Decision
`src/limits.ts` holds `MAX_API_REQUESTS_PER_RUN`, `MAX_DOWNLOADS_PER_RUN`, `MAX_FILE_BYTES` (200 MB; **amended 2026-08-30 → 350 MB** by owner decision after 13 of 156 test-account videos exceeded 200 MB; R2 usage stays well inside the 10 GB free tier at this volume), `MAX_TOTAL_BYTES` (owner default: alert at 9 GB, keep downloading; **amended 2026-08-31**: the alert was a one-shot KV key `alerts.storage`, so after firing at 14.56 GB on 2026-08-30 it could never warn again while the owner retried 52 `too_large` rows of 350 MB–1 GB. It is now keyed on the 3 GiB step crossed — `STORAGE_ALERT_STEP_BYTES`, keys `storage:9GB`, `storage:12GB`, `storage:15GB` … — and each run drops every other `storage*` key, so one Telegram message per step reached, a decrease below a step (delete) re-arms it, and the legacy key retires itself. A 3 GiB step is ~ $0.05/mo of R2 overage and ≈ 3–9 retried files, so one message per step is informative without being chatty; store-the-last-alerted-bytes was rejected because it needs a second KV field and does not re-arm on decrease by itself), and the pause duration. They are compile-time constants with a comment stating why, not environment variables. Any 401/403/429 from X sets `paused_until` in KV (24 h, or `x-rate-limit-reset` for 429), records the error, sends one alert, and skips scheduled runs until the pause expires or is cleared manually. Sync runs only from the cron trigger and the explicit backfill route; no other HTTP path can trigger API calls.

## Consequences
- easier: a runaway bug is bounded to a handful of requests per 30 minutes; the blast radius of an agent mistake is small and visible.
- harder: raising a cap is a code change with a journal line (intended).
- revisit when: a cap is hit in normal operation for a week (then raise it deliberately).
