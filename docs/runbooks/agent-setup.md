# Set up a new machine / teammate to work on this repo with Claude Code
When: first session on a new machine, or a teammate joins | Last verified: 2026-08-29 (owner's machine; plugin versions as of that date)

Everything the agent needs to *know* is in the repo (`CLAUDE.md`, `docs/`). This runbook covers only the *tools* that live outside the repo, at user scope, and therefore do not clone with it.

## Steps
1. Clone and open the repo:
   ```sh
   git clone <repo-url> x-downloader && cd x-downloader && claude
   ```
2. Install the plugins `CLAUDE.md` relies on (user scope; each is one command, run inside `claude` or from a shell):
   ```sh
   claude plugin install superpowers@claude-plugins-official   # brainstorming / writing-plans / TDD / verification skills (hard rule 6)
   claude plugin install context7@claude-plugins-official      # Context7 MCP for library facts (hard rule 5)
   claude plugin marketplace add cloudflare/skills
   claude plugin install cloudflare@cloudflare                 # wrangler + workers skills, cloudflare-docs MCP (no auth) and 4 authenticated Cloudflare MCPs
   ```
   Then `/reload-plugins` (or restart `claude`). Versions on 2026-08-29: superpowers 6.3.0, context7 0620a687ddd5, cloudflare 1.0.0.
3. Optional, only when deploying: `npm i -g wrangler` (or use `npx wrangler` from the project's `package.json` once it exists) and `wrangler login`. Never put Cloudflare or X credentials in the repo — see `docs/runbooks/setup-x-developer-app.md` and hard rule 1.
4. Optional Python tooling uses `uv` (owner preference, hard rule in `CLAUDE.md`): `curl -LsSf https://astral.sh/uv/install.sh | sh`.
5. Sandbox note: Claude Code's Bash sandbox blocks writes inside `.git`, so `git commit` prompts once per command to run unsandboxed. Accept it, or run `/sandbox` and allow `.git` for this project.
6. The MCP servers that need OAuth (`cloudflare-api`, `cloudflare-bindings`, `cloudflare-builds`, `cloudflare-observability`) authenticate on first use via `/mcp`. `cloudflare-docs` and `context7` need no auth.

## Verify
- In `claude`, `/help` lists `superpowers:brainstorming`, `superpowers:writing-plans`, `cloudflare:wrangler`.
- `claude mcp list` shows `context7` and `plugin:cloudflare:cloudflare-docs` as Connected.
- Start a session and confirm the agent reads `docs/STATUS.md` first (the `CLAUDE.md` session protocol) before doing anything.
- `./scripts/check-session.sh` runs and prints `check-session: no code changes, ok`.

## Rollback
`claude plugin uninstall <name>` for each plugin; `claude plugin marketplace remove cloudflare`. Nothing in the repo changes.

## Not required
Any other plugin on the owner's machine (`ponytail`, `codex`, `atlassian`, `posthog`, `sentry`, …) is personal tooling. `CLAUDE.md` does not depend on them.
