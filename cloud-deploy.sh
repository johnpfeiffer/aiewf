#!/bin/bash
set -euo pipefail

DEST="../codespaces-react/apps/aiewf/"

echo "=== 5 Most Recent Commits ==="
git log --oneline -5
echo "============================="

mkdir -p "$DEST"
rsync -av --delete \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.test.*' \
  --exclude='*.spec.*' \
  --exclude='__tests__/' \
  --exclude='*.log' \
  app/ "$DEST"
