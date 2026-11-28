#!/usr/bin/env bash
# Pre-submission checks for the Kiroween "Skeleton Crew" rules. Exit code 1 if anything fails.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

fail=0
ok()   { echo "  ok   $1"; }
bad()  { echo "  FAIL $1"; fail=1; }

echo "Checking submission requirements..."

# License at repo root
lic=""
for f in LICENSE LICENSE.md LICENSE.txt; do [ -f "$f" ] && lic="$f"; done
if [ -n "$lic" ]; then ok "license file present ($lic)"; else bad "no LICENSE file at repo root"; fi

# .kiro at root, committed, not ignored
if [ -d .kiro ]; then ok ".kiro/ exists at repo root"; else bad ".kiro/ missing at repo root"; fi
if git check-ignore -q .kiro 2>/dev/null; then bad ".kiro is gitignored (can disqualify the submission)"; else ok ".kiro is not gitignored"; fi
if [ -n "$(git ls-files .kiro | head -1)" ]; then ok ".kiro has tracked files"; else bad ".kiro has no tracked files (nothing committed)"; fi
for k in specs steering hooks; do
  if [ -n "$(git ls-files ".kiro/$k" | head -1)" ]; then ok ".kiro/$k is committed"; else bad ".kiro/$k has no committed files"; fi
done

# Two separate app folders, real files (no submodules)
for d in dungeon-crawler cyberops; do
  if [ -f "$d/game.json" ] && [ -f "$d/index.html" ]; then ok "$d/ has game.json + index.html"; else bad "$d/ missing or incomplete (need game.json and index.html)"; fi
done
if [ -f .gitmodules ]; then bad ".gitmodules present (submodules do not ship their code)"; else ok "no submodules"; fi

# Games must not contain custom engine code
for d in dungeon-crawler cyberops; do
  n=$(find "$d" -path "$d/vendor" -prune -o -path "$d/node_modules" -prune -o -path "$d/.kiro" -prune -o \( -name '*.ts' -o -name '*.tsx' \) -print 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" = "0" ]; then ok "$d/ has no TypeScript game code"; else bad "$d/ contains $n .ts/.tsx files (games must be data only)"; fi
done

# Docs
[ -f README.md ] && ok "README.md present" || bad "README.md missing"
[ -f KIRO_LOG.md ] && ok "KIRO_LOG.md present" || bad "KIRO_LOG.md missing"

if [ "$fail" = "0" ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit "$fail"
