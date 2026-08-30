#!/bin/sh
# Copies the paths listed in .worktreeinclude from the main checkout into this
# worktree. Paseo doesn't read .worktreeinclude, so paseo.json's setup calls this.
set -e

dest=$(git rev-parse --show-toplevel)
src=$(cd "$(git rev-parse --git-common-dir)/.." && pwd)
[ "$src" = "$dest" ] && exit 0

cd "$src"
grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' .worktreeinclude | while read -r pattern; do
  # shellcheck disable=SC2086 # patterns are globs, intentionally unquoted
  for path in $pattern; do
    [ -e "$path" ] || continue
    rsync -aR "$path" "$dest/"
    echo "worktreeinclude: $path"
  done
done
