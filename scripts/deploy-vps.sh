#!/usr/bin/env bash
# Builds the app for a domain root (e.g. https://tally.example.org) and copies it to a server.
#
#   DEPLOY_TARGET=user@host:/var/www/tally/ scripts/deploy-vps.sh
#
# DEPLOY_TARGET is any rsync destination. The target folder is made identical to the build
# (files that are not part of the app are deleted), so give it a folder of its own.
# Set SKIP_INSTALL=1 to skip `npm ci`.
set -euo pipefail

: "${DEPLOY_TARGET:?Set DEPLOY_TARGET, for example user@host:/var/www/tally/}"

cd "$(dirname "$0")/.."

if [ "${SKIP_INSTALL:-}" != "1" ]; then
  npm ci
fi

BASE_PATH="" npm run build
rsync -a --delete build/ "${DEPLOY_TARGET%/}/"
echo "Deployed to ${DEPLOY_TARGET}"
