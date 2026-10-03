#!/usr/bin/env bash
# Assemble index.html from its parts.
#
# The three brand modules (tribrand / tricard / trishare) are the family's own
# files under brand/ — they are concatenated in, never copied, so a fix to the
# share sheet lands in every game at once. The six game parts are local.
#
# Every part is normalised to LF on the way in, and the result is asserted to
# have no CR at all. This is not tidiness. `cat` copies bytes, and two of the
# brand modules sat in the working tree with CRLF endings while the rest of the
# family was LF, so the assembled file came out mixed — 427 CRLF lines and 2214
# LF ones, 427 bytes larger than the blob git actually stores (`.gitattributes`
# declares `*.js text eol=lf`, so git normalises on commit and `git status`
# stays clean either way).
#
# That gap is a trap rather than a nuisance: "compare the live byte count with
# the local one" is the first thing anyone checks when a deploy looks like it
# did not land, and it would have reported a false negative for a file that was
# serving perfectly. The sources are LF now; this makes it stay that way.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"        # the games workspace
BRAND="$ROOT/brand"

OUT="$HERE/../index.html"

# how many CR bytes are in a file. Counted with `tr`, not with
# `grep -c $'\r'`, because on Git Bash an unquoted `$'\r'` collapses to an
# EMPTY pattern: `grep -c` then counts every line in the file and reports a
# pure-LF file as 134 CRLF lines out of 134. A diagnostic that reports the
# opposite of the truth is worse than no diagnostic.
cr_count() { tr -dc '\r' < "$1" | wc -c | tr -d ' '; }

# strip a trailing CR from every line, and say so when a part needed it
norm() {
  local f="$1" n
  n=$(cr_count "$f")
  if [ "$n" != "0" ]; then
    echo "  note  $(basename "$f"): normalised $n CRLF line(s) to LF" >&2
  fi
  sed 's/\r$//' "$f"
}

{
  for part in \
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
  ; do
    norm "$part"
  done
} > "$OUT"

printf '\n</script>\n</body>\n</html>\n' >> "$OUT"

# A CR that survives to here means norm() is broken, and the only symptom would
# be a byte-count difference against the deployed file — i.e. it would look
# exactly like a failed deploy. Fail loudly instead.
if [ "$(cr_count "$OUT")" != "0" ]; then
  echo "assemble: CRLF survived into $OUT — norm() is not doing its job" >&2
  exit 1
fi

echo "built $OUT  ($(wc -c < "$OUT") bytes, all LF)"
