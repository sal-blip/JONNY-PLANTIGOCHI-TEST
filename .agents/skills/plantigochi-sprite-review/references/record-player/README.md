# Walnut record player

The approved turntable has an uncovered walnut plinth, a satin-metal chassis and a celadon record label. The small vermilion grip sits on the lower-right groove, clear of the cue control. The S-shaped tonearm, cartridge and reflected light stay still as the two printed label marks rotate. [Approval board](comparison.png) · [Shop](approved/shop.png) · [Sofa-side table](approved/room.png) · [Bookcase](approved/bookcase.png) · [Seven playback frames](approved/playback.png)

The transparent base uses a 47 × 41 grid with anchor (23, 35). Relative to this anchor, the center of the record is (−4, −16) and the tonearm pivots around (+14, −22). The ellipse of the vinyl has nominal radii of 12.8 and 6.25 pixels. The record SKU draws at (34.75, 54) at 1.45× on the 72 × 64 shop tile. Its four clear columns at either side keep the wood and counterweight fully visible. The table draws the deck at (317, 240) at 1× and the bookcase at (77, 46) at 0.83×.

## Reproduce and verify

From the repository root, reproduce the base with Pillow and compare the generated encoding with the runtime sprite. The seven-frame playback check uses the real room renderer, including its 255 ms frame interval. It also exercises stopped and reduced-motion behavior at each mount.

```sh
review=.agents/skills/plantigochi-sprite-review
ref="$review/references/record-player"
output=$(mktemp -d)
python "$ref/draw-turntable.py" "$output/deck.png"
python "$review/scripts/encode-sprite.py" "$output/deck.png" src/recordPlayerSprite.js --anchor 23 35 --check
npm ci --prefix "$review/scripts"
node "$ref/verify-playback.mjs"
(cd "$ref" && sha256sum -c SHA256SUMS)
```

The playback check draws the current turntable over the empty sofa-side corner of the approved bookcase image. It compares all seven results with the frozen playback strip, then compares each phase on all six current mounts at noon and night. The historical room images preserve the scenery that was present at approval. To check the table, bookcase and shop images pixel for pixel, use the historical backdrop procedure. [Verify the native room and shop images](../historical-backdrop.md)
