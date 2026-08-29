# 0002. Read bookmarks via the official X API v2 (pay-per-use), not session cookies or a headless browser
Date: 2026-08-29 | Status: DECIDED (owner, Q1 = c) | Supersedes: — | Evidence: docs/research/2026-08-29-persona-x-scraper.md, docs/research/2026-08-29-persona-security.md, docs/research/2026-08-29-x-api-v2.md

## Context
Three ways exist to read one's own bookmarks: (A) replay the web client's session cookies against X's internal GraphQL, (B) the official API v2 bookmarks endpoint, now pay-per-use at roughly $0.001 per Post read, (C) a headless browser that logs in. A stores a password-equivalent secret, violates X's terms, and depends on an unverified assumption that X tolerates Cloudflare egress IPs; C is A with extra login-challenge pain; B costs on the order of $1–3/month and is the only terms-compliant option.

## Decision
Use the official X API v2 with OAuth 2.0 user context (Authorization Code + PKCE, `offline.access` for refresh tokens). Store client credentials as Worker secrets and the rotating refresh token in KV. No session cookies, no browser, no internal GraphQL. Accept the small monthly API cost.

## Consequences
- easier: stable, documented endpoint; no anti-bot headers, queryId rotation, or account-lock risk; the "does X accept Cloudflare IPs" spike is unnecessary.
- harder: one-time OAuth consent flow (a `/oauth/callback` route in the Worker); refresh-token rotation must be handled atomically; only the 800 most recent bookmarks are reachable; requires an X developer app and a card on file.
- revisit when: X removes or reprices pay-per-use reads, or the bill exceeds ~$5/month (then reconsider cadence or approach A behind a residential proxy).
