#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run build
npm run smoke
node dist/src/cli.js preview fixtures/github-comment.json --format json >/tmp/connector-impact-preview-smoke.json
