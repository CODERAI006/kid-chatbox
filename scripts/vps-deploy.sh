#!/usr/bin/env bash
#
# VPS / production deploy: pull code, install deps, migrate Postgres, build client, restart PM2.
#
# Usage (on the server, from repo root):
#   chmod +x scripts/vps-deploy.sh
#   ./scripts/vps-deploy.sh
#
# Optional env:
#   GIT_BRANCH=main          # branch for git pull
#   SKIP_GIT=1               # skip git pull
#   SKIP_BUILD=1             # skip npm run build (server-only quick deploy)
#   SKIP_PM2=1               # skip pm2 restart
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRANCH="${GIT_BRANCH:-main}"

echo "==> kid-chatbox VPS deploy (root: $ROOT)"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $ROOT — copy from .env.production.example and configure DATABASE_* / DB_*." >&2
  exit 1
fi

if [[ -d .git && "${SKIP_GIT:-}" != "1" ]]; then
  echo "==> git fetch && pull ($BRANCH)"
  git fetch origin "$BRANCH"
  git pull origin "$BRANCH"
fi

echo "==> npm install"
npm install

echo "==> database migrations (idempotent)"
npm run db:migrate-all

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  echo "==> production frontend build"
  NODE_ENV=production npm run build
  if [[ ! -d dist ]]; then
    echo "ERROR: dist/ missing after build." >&2
    exit 1
  fi
fi

if [[ "${SKIP_PM2:-}" != "1" ]]; then
  if command -v pm2 >/dev/null 2>&1; then
    echo "==> pm2 reload"
    pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save
  else
    echo "WARN: pm2 not in PATH — start the API manually (e.g. npm run start)." >&2
  fi
fi

echo "==> done"
