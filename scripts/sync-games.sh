#!/usr/bin/env bash
# Sync the two game repos into this (submission) repo as REAL files using git subtree.
#   - no submodules, full commit history and authorship preserved
#   - mirrors each game's .kiro/{specs,steering,hooks,agents} into the root .kiro/ (prefixed)
#
# Usage:  scripts/sync-games.sh            # pulls main of both game repos
#         BRANCH=dev scripts/sync-games.sh
#         ORG_URL=/path/to/local/repos scripts/sync-games.sh   # for testing
#
# Never edit dungeon-crawler/ or cyberops/ directly in this repo; change them in their own repos.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

ORG_URL="${ORG_URL:-https://github.com/Reforge-Dev}"
BRANCH="${BRANCH:-main}"

# "folder:repo" pairs (kept as a plain list so this works on bash 3.2 as well)
GAMES="dungeon-crawler:ReForge-Dungeon cyberops:ReForge-CyberOps"

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is not clean; commit or stash first" >&2
  exit 1
fi

for pair in $GAMES; do
  dir="${pair%%:*}"
  repo="${pair##*:}"
  url="$ORG_URL/$repo"
  case "$ORG_URL" in http*) url="$url.git" ;; esac

  if [ -d "$dir" ]; then
    echo ">> pulling $repo into $dir/"
    git subtree pull --prefix="$dir" "$url" "$BRANCH" -m "sync: pull $dir from $repo"
  else
    echo ">> adding $repo as $dir/"
    git subtree add --prefix="$dir" "$url" "$BRANCH" -m "sync: add $dir from $repo"
  fi
done

# Mirror each game's Kiro artifacts into the root .kiro/ so judges see everything at the root.
# (Done after all subtree operations: git subtree refuses to run on a dirty working tree.)
for pair in $GAMES; do
  dir="${pair%%:*}"
  if [ -d "$dir/.kiro" ]; then
    for kind in specs steering hooks agents; do
      [ -d "$dir/.kiro/$kind" ] || continue
      mkdir -p ".kiro/$kind"
      for item in "$dir/.kiro/$kind"/*; do
        [ -e "$item" ] || continue
        rm -rf ".kiro/$kind/$dir-$(basename "$item")"
        cp -R "$item" ".kiro/$kind/$dir-$(basename "$item")"
      done
    done
  fi
done

git add .kiro 2>/dev/null || true
if ! git diff --cached --quiet; then
  git commit -m "sync: mirror game .kiro artifacts into root .kiro"
fi

echo "done. Run scripts/check-submission.sh next."
