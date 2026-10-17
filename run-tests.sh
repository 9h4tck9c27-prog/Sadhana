#!/usr/bin/env bash
# Every suite, against site/index.html. Exits non-zero if any fail.
cd "$(dirname "$0")"
fail=0
for f in tests/*.test.js; do
  printf '%-14s ' "$(basename "$f" .test.js)"
  out=$(node "$f" 2>&1) || fail=1
  echo "$out" | grep -E 'passed,' | tail -1 || { echo "ERROR"; echo "$out" | tail -5; }
done
exit $fail
