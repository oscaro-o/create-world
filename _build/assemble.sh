#!/usr/bin/env bash
# Assemble index.html from its parts.
#
# The brand modules (tribrand / tricard / trishare) are the family's own files
# under brand/ — they are concatenated in, never copied, so a fix to the share
# sheet lands in every game at once. The four game parts are local.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"        # the games workspace
BRAND="$ROOT/brand"

OUT="$HERE/../index.html"

cat \
  "$HERE/head.html" \
  "$HERE/head2.html" \
  "$HERE/body.html" \
  "$BRAND/tribrand.js" \
  "$BRAND/tricard.js" \
  "$BRAND/trishare.js" \
  "$HERE/game1.js" \
  "$HERE/game2.js" \
  "$HERE/game2b.js" \
  "$HERE/game3.js" \
  "$HERE/game4.js" \
  "$HERE/game5.js" \
  > "$OUT"

printf '\n</script>\n</body>\n</html>\n' >> "$OUT"

echo "built $OUT  ($(wc -c < "$OUT") bytes)"
