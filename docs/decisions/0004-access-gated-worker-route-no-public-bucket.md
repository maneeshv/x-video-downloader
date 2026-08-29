# 0004. Videos are served through a Cloudflare-Access-gated Worker route; the bucket is never public
Date: 2026-08-29 | Status: DECIDED (owner accepted default) | Supersedes: — | Evidence: docs/research/2026-08-29-persona-security.md

## Context
An R2 custom domain or r2.dev URL makes every object world-readable by URL. Unguessable keys are obscurity, not authentication, and public re-hosting of other people's videos is the one legally uncomfortable outcome. Cloudflare Access is free for up to 50 users and can be attached to a Worker in one click (since 2025-10).

## Decision
No public bucket, no r2.dev, no custom domain on the bucket. The Worker serves `GET /` (index) and `GET /v/:id` (stream with Range support) behind Cloudflare Access (email one-time PIN). The Worker also validates the `cf-access-jwt-assertion` header so a misconfigured Access policy cannot expose videos. Bulk download uses R2's S3 API with a scoped token (`rclone`).

## Consequences
- easier: zero auth code beyond a JWT check; MFA-grade login for free; nothing shareable by accident.
- harder: every view goes through the Worker (fine at personal volume); sharing a single video with someone requires adding them to the Access policy.
- revisit when: the owner wants to share videos outside their own Access policy.
