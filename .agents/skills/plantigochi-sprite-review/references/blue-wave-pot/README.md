# Blue wave pot

The player approved the pale stoneware pot with a rolled lip, widely spaced cobalt seigaiha arches and an exposed clay foot. The approval sheet shows the native shop tile and the living-room coffee table, both empty and planted with the Golden pothos. [Approval sheet](comparison.png)

The master is a transparent 65 × 67 image with the bottom center of the foot at (32, 60). The room renderer supplies the contact shadow and draws foliage two grid pixels higher for this pot. The 72 × 64 shop tile uses (33, 49) at 1.85×. The room view uses slot 4 at (152, 245), 0.94×, at noon with reduced motion. The planted specimen is `nursery-golden-pothos`, pot style 0. The background used for approval is from revision `adced93`.

Run these commands from the game repository root with Node.js 24, Python 3 and Pillow. The checker compares the native shop tile, empty and planted pots in the historical room, and both placement crops. It draws the same pots through the current room renderer to check their appearance on the open coffee table. The separate coffee table check verifies the complete daytime and nighttime rooms. [Coffee table reference](../coffee-table/README.md)

```sh
review=.agents/skills/plantigochi-sprite-review
ref="$review/references/blue-wave-pot"
out=$(mktemp -d)
python "$ref/draw-wave.py" "$out/wave-pot.png"
python "$review/scripts/encode-sprite.py" "$out/wave-pot.png" src/blueWavePotSprite.js --anchor 32 60 --check
npm ci --prefix "$review/scripts"
node "$ref/verify-planted.mjs" .
node "$review/references/coffee-table/verify.mjs"
```

The original lamp reference supplies the unoccupied approval backdrop. The historical pot check uses the original slot, clip, and scale, so changes to the table surface cannot alter the archival comparison. For a side-by-side board, pass a separate checkout at `adced93` to the comparison tool as `--before` and the current game as `--after`. [Frozen image hashes](SHA256SUMS)
