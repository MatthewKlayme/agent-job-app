#!/usr/bin/env bash
set -euo pipefail
npm i -g esbuild >/dev/null 2>&1 || true
for svc in fetcher ranker tailor submitter; do \
  (cd services/$svc && npx esbuild handler.ts --bundle --platform=node --target=node20 --outfile=dist.js); \
  (cd services/$svc && npx esbuild run.ts --bundle --platform=node --target=node20 --outfile=run.js); \
  echo "Built $svc"; \
done