#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts logs config
cp -n .env.example .env || true
echo "Bootstrap complete. Edit .env and config/*.json."