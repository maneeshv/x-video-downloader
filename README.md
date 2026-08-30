# x-downloader

Bookmark a video on X/Twitter → it lands in your own Cloudflare R2 bucket within 30 minutes, with a
private, Access-gated page to watch or download it. One Cloudflare Worker, one R2 bucket, one KV
namespace, one D1 table. Designed to cost ~$0/month for one person.

Status: **v1 running** (since 2026-08-30). Live state: `docs/STATUS.md`.

- Setup and deploy: `docs/runbooks/setup-x-developer-app.md`, then `docs/runbooks/deploy.md`.
- How it works: `docs/ARCHITECTURE.md`. Why it is this way: `docs/decisions/`.
- Secrets: copy `.env.example` → `.env`; config: copy `wrangler.toml.example` → `wrangler.toml`. Neither is committed.
- Develop: `npm install`, `npm test`, `npm run typecheck`. Deploy: `npx wrangler deploy` (manual by design, ADR-0010).

This repository is maintained entirely by an AI coding agent. Agents start with `CLAUDE.md`;
humans start with `docs/PRODUCT.md`.
