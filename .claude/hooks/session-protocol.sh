#!/usr/bin/env bash
# Claude Code session-protocol hooks (ADR-0014). One script, three events, wired in .claude/settings.json:
#   prompt   UserPromptSubmit    remember HEAD at turn start
#   failure  PostToolUseFailure  log a failed Bash command (candidate gotcha)
#   stop     Stop                block the stop ONCE if code changed without JOURNAL/STATUS, or commands
#                                failed this session and nothing has asked whether they were gotchas
# Hook JSON arrives on stdin; `jq` is /usr/bin/jq on macOS. State is per session, outside the repo.
# Hook contract: https://code.claude.com/docs/en/hooks (read 2026-08-31).
set -euo pipefail
input=$(cat)
event=${1:?usage: session-protocol.sh prompt|failure|stop}
sid=$(jq -r '.session_id // "nosession"' <<<"$input")
cwd=$(jq -r '.cwd // "."' <<<"$input")
state="${TMPDIR:-/tmp}/x-downloader-hooks/$sid"
mkdir -p "$state"
cd "$cwd"

case "$event" in
prompt)
  # stdout of UserPromptSubmit becomes prompt context — keep it silent.
  git rev-parse HEAD >"$state/turn_head" 2>/dev/null || true
  ;;
failure)
  [ "$(jq -r '.is_interrupt // false' <<<"$input")" = "true" ] && exit 0
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input" | tr '\n' ' ' | head -c 160)
  err=$(jq -r '.error // empty' <<<"$input" | head -1 | head -c 80)
  # ponytail: logs every non-zero exit (grep no-match included); the stop nudge asks the agent to judge.
  # Add a denylist here if the nudge gets noisy.
  [ -n "$cmd" ] && printf -- '- %s — `%s`\n' "$err" "$cmd" >>"$state/failures"
  ;;
stop)
  # Claude Code re-runs Stop after a block with stop_hook_active=true; pass then, or the session can never end.
  [ "$(jq -r '.stop_hook_active // false' <<<"$input")" = "true" ] && exit 0
  base=$(cat "$state/turn_head" 2>/dev/null || echo HEAD)
  git rev-parse -q --verify "$base^{commit}" >/dev/null 2>&1 || base=HEAD
  reasons=""
  if ! out=$(scripts/check-session.sh "$base" 2>&1); then
    reasons+="$out — prepend a JOURNAL entry and rewrite STATUS (CLAUDE.md END 1-2), commit them with the code."$'\n'
  fi
  if [ -s "$state/failures" ]; then
    reasons+="Commands failed this session and nothing has yet asked whether they were gotchas:"$'\n'
    reasons+="$(cat "$state/failures")"$'\n'
    reasons+="A failure that worked on retry with different flags/unsandboxed, a misleading error, or a wrong first assumption → docs/GOTCHAS.md line + JOURNAL \"Learned / gotcha\". Trivial (grep no-match, expected failure) → ignore."$'\n'
    cat "$state/failures" >>"$state/failures.seen" && : >"$state/failures" # nudge once per failure
  fi
  [ -z "$reasons" ] && exit 0
  jq -n --arg r "END protocol (CLAUDE.md) not satisfied for this turn:"$'\n'"$reasons""Fix, then stop again (the second stop passes)." \
    '{decision: "block", reason: $r}'
  ;;
esac
