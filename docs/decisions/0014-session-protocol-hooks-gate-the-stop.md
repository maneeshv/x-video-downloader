# 0014. Claude Code hooks gate the end of every turn against the session protocol
Date: 2026-08-31 | Status: DECIDED (owner: "I like your recommendation. Let's do that.") | Supersedes: — | Evidence: `.claude/hooks/session-protocol.sh`, `.claude/settings.json`, `scripts/check-session.sh`

## Context
On 2026-08-31 the END protocol ran once when the agent said "done"; a `git push` that failed in a later turn (sandbox blocked SSH, misleading error) went unrecorded until the owner asked, and "what counts as a gotcha" was left to judgment. `CLAUDE.md` is an instruction; `scripts/check-session.sh` runs only when the agent remembers to. Candidates: re-inject `CLAUDE.md` via a hook (useless — it is already loaded every session), a per-prompt reminder (`UserPromptSubmit` text; a reminder, not a gate), or a `Stop` hook that mechanically blocks the turn from ending until the protocol is satisfied.

## Decision
Three hooks in the committed `.claude/settings.json`, one script `.claude/hooks/session-protocol.sh`, state in `$TMPDIR/x-downloader-hooks/<session_id>/`:
- `UserPromptSubmit` records `HEAD` at turn start, so commits made mid-turn count as "this turn".
- `PostToolUseFailure` (matcher `Bash`) appends each failed command + first error line to `failures`.
- `Stop` runs `scripts/check-session.sh <turn-start HEAD>` (code changed → JOURNAL + STATUS must have changed too) and lists any un-acknowledged failures with the gotcha triggers from `CLAUDE.md` END 1. Either → `{"decision":"block","reason":…}`. It honours `stop_hook_active` (passes on the re-run), so it is one enforced nudge per turn, not a loop; failures are marked seen once nudged.
Deterministic checks only; the judgment ("is this a gotcha?") stays with the agent, prompted at the right moment. `jq` (macOS built-in) and `git`; no npm or Python dependency.

## Consequences
- easier: a post-"done" turn that pushed, deployed or fixed something cannot end silently; a failed command is surfaced at the end of the turn with the trigger list, instead of depending on the owner noticing.
- harder: one extra block/continue cycle on turns that trip it; `grep`-no-match style failures are listed too (the message says to ignore trivial ones — add a denylist in the `failure` branch if it gets noisy); hooks load at session start, so a session running when `settings.json` changes does not pick them up; the gate is bypassed if a session ignores the nudge on the `stop_hook_active` re-run (deliberate: the alternative is an unstoppable session).
- revisit when: the nudge fires on more than ~1 in 5 turns for noise (add the denylist), or Claude Code exposes a per-turn hook input that makes the `turn_head` marker unnecessary.
