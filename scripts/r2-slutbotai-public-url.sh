#!/usr/bin/env bash
set -euo pipefail
BUCKET=slutbotai
echo "Checking public dev URL for bucket: $BUCKET"
npx wrangler r2 bucket dev-url get "$BUCKET"
echo
echo "If disabled, enable ONLY on slutbotai (requires wrangler login):"
echo "  npx wrangler r2 bucket dev-url enable $BUCKET"
echo "Then set NEXT_PUBLIC_PRESET_MEDIA_BASE to the printed https://pub-....r2.dev URL in .env.local"
