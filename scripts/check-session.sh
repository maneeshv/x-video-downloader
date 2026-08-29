#!/usr/bin/env bash
# Fails if product code changed (vs HEAD) but the session docs were not updated.
# ponytail: plain git diff, no framework. Extend the CODE_PATHS glob when src/ layout changes.
set -euo pipefail
cd "$(dirname "$0")/.."
changed=$(git diff --name-only HEAD; git diff --name-only --cached HEAD; git ls-files --others --exclude-standard)
code_changed=$(echo "$changed" | grep -E '^(src/|wrangler\.|package\.json)' || true)
[ -z "$code_changed" ] && { echo "check-session: no code changes, ok"; exit 0; }
missing=""
echo "$changed" | grep -q '^docs/JOURNAL.md$' || missing="$missing docs/JOURNAL.md"
echo "$changed" | grep -q '^docs/STATUS.md$'  || missing="$missing docs/STATUS.md"
[ -z "$missing" ] && { echo "check-session: ok"; exit 0; }
echo "check-session: code changed but not updated:$missing" >&2
exit 1
