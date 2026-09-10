#!/usr/bin/env bash
set -euo pipefail
repo="${1:?Usage: preflight.sh /absolute/path/to/Courtwork}"
cd "$repo"
printf '\nRepository: '; git rev-parse --show-toplevel
printf 'HEAD: '; git rev-parse HEAD
printf 'Branch: '; git branch --show-current
printf '\nWorktree status (no changes performed):\n'; git status --short
printf '\nRuntime versions:\n'; node --version; python3 --version
node --input-type=module - <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
const p=JSON.parse(fs.readFileSync('app/package.json','utf8'));
console.log(JSON.stringify({engines:p.engines,dependencies:p.dependencies,scripts:p.scripts},null,2));
console.log('lockSHA256:',crypto.createHash('sha256').update(fs.readFileSync('app/package-lock.json')).digest('hex'));
const [major,minor,patch]=process.versions.node.split('.').map(Number);
if(major<22 || (major===22 && minor<19)) {
  console.error('Baseline package requires Node >=22.19.0. Do not claim supported-environment validation.');
  process.exitCode=2;
}
JS
base='0c60f4ffe0e4d939712df3910d2404c226e8bfdf'
printf '\nReview baseline relation:\n'
if git cat-file -e "$base^{commit}" 2>/dev/null; then
  if [[ "$(git rev-parse HEAD)" == "$base" ]]; then
    echo 'BASE_MATCH'
  elif git merge-base --is-ancestor "$base" HEAD; then
    echo 'DESCENDANT: delta review is required; do not repeat implemented work.'
    git diff --stat "$base" HEAD -- app engineering docs .github
  else
    echo 'DIVERGED: integration owner must reconcile, no automatic checkout/reset.'
  fi
else
  echo 'BASE_NOT_LOCAL: shallow/history-limited checkout; verify with integration owner.'
fi
printf '\nNo worktree, data directory, dependency or credential was changed.\n'
