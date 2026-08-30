# 0010. Deploy by hand with `wrangler deploy`; no CI pipeline in v1

Date: 2026-08-30 | Status: DECIDED | Evidence: docs/runbooks/deploy.md (every deploy 2026-08-30 was manual), docs/JOURNAL.md

## Context
The owner asked how deployments are done (2026-08-30). Every deploy so far was `npx wrangler deploy`
run from a laptop that has done `wrangler login`, following `docs/runbooks/deploy.md`. Nothing in the
repo said this was a decision rather than an accident.

## Decision
v1 deploys manually: `npm run check` (tests + typecheck) then `npx wrangler deploy` from a machine
logged into the Cloudflare account. Secrets go in with `wrangler secret put` from `.env` (never
committed; `.env.example` lists the keys). Config lives in `wrangler.toml` (ignored; template in
`wrangler.toml.example`). No GitHub Actions, no deploy on push.

## Reasoning
- One deployer, a few deploys a week at most. A pipeline would need a Cloudflare API token stored in
  GitHub, a workflow file, and a second place where `wrangler.toml` values must exist — more surface
  than the thing it automates.
- `wrangler rollback` already gives one-command undo (runbook "Rollback").
- The agent runs the deploy and the verification in the same session, and records it in
  `docs/JOURNAL.md`, which is the audit trail CI would otherwise provide.

## Revisit when
- A second person deploys (a token in GitHub beats sharing a laptop login), or
- a deploy ships untested code (then `npm run check` must gate `deploy` mechanically: a GitHub Action
  on push to `main` with `cloudflare/wrangler-action` and a scoped API token), or
- `main` is merged without a deploy and drifts from what runs.
