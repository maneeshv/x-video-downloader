# Research: Cloudflare platform facts & native design (persona: CF architect)
Date: 2026-08-29 | Source: brainstorm subagent with web citations (docs verified 2026-08-29)

## Verified facts
**Workers** (https://developers.cloudflare.com/workers/platform/limits/, /pricing/)
- Free: 100k req/day, **10 ms CPU per invocation (incl. cron)**, 50 subrequests/request, 128 MB memory, 6 simultaneous connections.
- Paid: $5/mo, 10M req + 30M CPU-ms/mo, 30 s CPU default (5 min max), 10k subrequests.
- CPU ≠ wall time: network wait is free. Cron/queue invocations get 15 min wall time.
- Response body: no enforced limit. Streams API passes multi-GB bodies without buffering.

**Cron Triggers** (https://developers.cloudflare.com/workers/configuration/cron-triggers/): 1-minute granularity; Free: 5 per account; changes take up to 15 min to propagate.

**R2** (https://developers.cloudflare.com/r2/pricing/, /platform/limits/, /api/workers/workers-api-reference/)
- Free: 10 GB-mo storage, 1M Class A, 10M Class B /month. Over: $0.015/GB-mo, Class A $4.50/M, Class B $0.36/M. Egress free. Deletes free.
- Single `put()` up to 5 GiB. `put()` accepts a `ReadableStream` **only with known length** (fetch body with `Content-Length`, or `FixedLengthStream`), else "Provided readable stream must have a known length" (https://www.answeroverflow.com/m/1338991073011433502). Multipart only for unknown-length sources.
- r2.dev is rate-limited/dev-only; custom domain for real serving.

**Queues** (https://developers.cloudflare.com/queues/platform/pricing/, updated 2026-04-21): **Free plan available** — 10k ops/day, 24 h retention. Paid: 1M ops/mo, 14-day retention.

**Workflows** (https://developers.cloudflare.com/workflows/reference/pricing/, /limits/): Free and Paid. Free: 100k req/day, **3,000 steps/day**, 1 GB state, 10 ms CPU/step, 1,024 steps/instance, 100 concurrent, unlimited wall time per step, 10k retries/step. Paid: 500k steps/mo + $0.80/100k (step billing since 2026-08-10).

**D1** (https://developers.cloudflare.com/d1/platform/pricing/): Free 5M row reads/day, 100k writes/day, 5 GB.
**KV** (https://developers.cloudflare.com/kv/platform/pricing/): Free 100k reads/day, **1,000 writes/day**, 1 GB.
**Durable Objects** (SQLite): Free 100k req/day, 5 GB.

**Browser Run** (renamed from Browser Rendering 2026-04-15; https://developers.cloudflare.com/browser-run/limits/, /pricing/, /faq/)
- Free: **10 min browser time/day**, 3 concurrent, 1 new instance/20 s. Paid: 10 h/mo included, then $0.09/h, $2/extra concurrent browser.
- 60 s inactivity timeout, `keep_alive` ≤10 min; **no persistent browser across invocations** — cookies re-injected each run. Browser Run traffic is always flagged bot to Cloudflare Bot Management; X's detection unknown.

**Secrets** (https://developers.cloudflare.com/workers/configuration/secrets/): write-only, no rotation/expiry feature. Secrets Store in open beta.

**Cloudflare ToS** (https://www.cloudflare.com/terms/ §2.2.1, §2.7; developer-platform terms): nothing Cloudflare-side bans fetching X; exposure is X's ToS.

**X API**: bookmarks endpoint not on any free tier; X moved to pay-per-use 2026-02 (https://docs.x.com/x-api/posts/bookmarks/introduction, https://postproxy.dev/blog/x-api-pricing-2026/).

## Uncertain / could not verify
1. Whether piping a 500 MB fetch body into `R2.put()` stays under 10 ms CPU on Free. Docs say I/O wait is free; no published guarantee. **Test on Free; if Error 1102, Paid ($5) fixes it.**
2. Whether `video.twimg.com` always sends `Content-Length`. If not: HEAD first or multipart (5 MiB parts).
3. Whether X blocks Cloudflare egress IPs / cookie replay from datacenter IPs. Not documented.
4. X session cookie lifetime — months in practice, unverified.

## This persona's proposed architecture
Cron `*/30` → Poller Worker fetches X internal Bookmarks GraphQL with secrets (no browser) → diff against D1 `processed` table → per new video, `WORKFLOW.create()`: (1) resolve best mp4, (2) fetch → `BUCKET.put` (known length), (3) D1 insert. Serve via R2 custom domain. Alert on 401 via a D1 row + manual `wrangler secret put`.
Skipped: Queues (Workflows covers it), KV (1k writes/day tight), Browser Run (fallback only; Free 10 min/day ≈ 20 × 30 s runs).
> Note (synthesis): the lazy-skeptic persona argues D1 and Workflows are unnecessary (R2 key as ledger, next cron as retry). See the design spec for the resolution.

## Cost table (Workers Free unless noted)
| Component | (a) 100 vid/mo × 30 MB | (b) 1000 vid/mo × 30 MB |
|---|---|---|
| Workers (cron ~1,440 inv/mo) | $0 | $0 |
| Workflows/Queues/D1/R2 ops | $0 | $0 |
| R2 storage (cumulative) | $0 until ~month 4; month 12 (36 GB) ≈ $0.39/mo | month 1 $0.30; month 12 (360 GB) ≈ $5.25/mo |
| Egress | $0 | $0 |
| Browser Run (only if needed) | Paid $5 + ~$1.30 | same |
| **Total** | **$0 → ~$0.40/mo** | **$0.30 → ~$5/mo** (storage-driven) |
Storage is the only unavoidable line item; R2 Infrequent Access ($0.01/GB) or deletion of old videos if it matters.
