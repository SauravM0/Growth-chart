#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TOOL_DIR="$ROOT_DIR/tools/curve_extractor"

python3 "$TOOL_DIR/extract_curves.py" \
  --anchors "$TOOL_DIR/anchors/boys_manual_anchors.json" \
  --out-curves "$TOOL_DIR/out/boys_combined_curves.json" \
  --out-preview "$TOOL_DIR/preview/boys_overlay.svg"

python3 "$TOOL_DIR/extract_curves.py" \
  --anchors "$TOOL_DIR/anchors/girls_manual_anchors.json" \
  --out-curves "$TOOL_DIR/out/girls_combined_curves.json" \
  --out-preview "$TOOL_DIR/preview/girls_overlay.svg"

echo "Done. Outputs in: $TOOL_DIR/out and $TOOL_DIR/preview"
