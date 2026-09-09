#!/usr/bin/env bash
set -euo pipefail

# Find the base branch: the most likely target for a pull request.
#
# Strategy: pick the remote branch whose merge-base with HEAD is most recent
# (i.e., the branch we most likely forked from). This works even when the
# base branch has advanced past the fork point.
#
# 1. Check well-known stable branches first (main, master, develop, staging).
#    Among those that exist, pick the one with the closest merge-base to HEAD.
# 2. If none match, fall back to any remote branch with the closest merge-base.

current=$(git rev-parse --abbrev-ref HEAD)

# The remote is not always called "origin". Prefer the current branch's own remote, then origin,
# then whatever single remote exists.
remote=$(git config --get "branch.$current.remote" 2>/dev/null || true)
if [[ -z "$remote" ]]; then
  if git remote get-url origin >/dev/null 2>&1; then
    remote=origin
  else
    remote=$(git remote | head -1)
  fi
fi
if [[ -z "$remote" ]]; then
  echo "No git remote found" >&2
  exit 1
fi

best_branch=""
best_ts=0

# Keep the candidate whose merge-base with HEAD is the most recent one seen so far. Earlier
# candidates win ties, so the priority 1 order below decides between equally close branches.
consider() {
  local ref=$1 branch=$2 mb ts
  [[ "$branch" == "HEAD" || "$branch" == "$current" ]] && return 0
  mb=$(git merge-base HEAD "$ref" 2>/dev/null) || return 0
  ts=$(git log -1 --format=%ct "$mb" 2>/dev/null) || return 0
  if [[ -n "$ts" ]] && (( ts > best_ts )); then
    best_ts=$ts
    best_branch=$branch
  fi
  return 0
}

# Priority 1: well-known base branches
for candidate in main master develop staging; do
  ref="$remote/$candidate"
  git rev-parse --verify "$ref" >/dev/null 2>&1 || continue
  consider "$ref" "$candidate"
done

# Priority 2: any other remote branch.
# Full refnames, not %(refname:short): the short form of <remote>/HEAD is just <remote>, which
# slips past the HEAD check in consider() and gets reported as if it were a branch.
if [[ -z "$best_branch" ]]; then
  while IFS= read -r ref; do
    consider "$ref" "${ref#"refs/remotes/$remote/"}"
  done < <(git for-each-ref --format='%(refname)' "refs/remotes/$remote/")
fi

if [[ -z "$best_branch" ]]; then
  echo "No base branch found" >&2
  exit 1
fi

echo "$best_branch"
