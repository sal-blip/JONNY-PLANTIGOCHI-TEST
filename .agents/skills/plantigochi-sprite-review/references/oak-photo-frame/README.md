# Oak photo frame

Four mitred oak rails enclose a single gold ginkgo fan against dark green paper. The narrow back stay sits behind the right edge. A player’s original photo fits the 17 × 17 opening at (−8, −24) from the mount. At the sofa-side table’s native scale, the image starts at room coordinates (309, 216). [Approval comparison](comparison.png) · [Shop](approved/shop.png) · [Table](approved/shelf.png) · [Bookcase](approved/shelf-bookcase.png)

The transparent 47 × 41 master is anchored at (23, 36). The native 72 × 64 shop preview uses (32, 55) at 1.75×. Room 0 uses (317, 240) at 1× on the table and (77, 46) at 0.83× on the bookcase. [Drawing recipe](draw-oak.py) · [Runtime sprite](../../../../../src/oakFrameSprite.js) · [Photo placement](../../../../../src/roomShopArt.js)

From the repository root, rebuild the native master with Pillow and run the game's shop and room renderers. Set `before` to a checkout of revision `ed89ef5` for the original comparison.

```sh
review=.agents/skills/plantigochi-sprite-review
ref="$review/references/oak-photo-frame"
output=$(mktemp -d)
before=../plantigochi-before
python "$ref/draw-oak.py" "$output/oak.png"
cmp "$output/oak.png" "$ref/oak-frame.png"
python "$review/scripts/encode-sprite.py" "$output/oak.png" src/oakFrameSprite.js --anchor 23 36 --check
npm ci --prefix "$review/scripts"
node "$review/scripts/render-comparison.mjs" --before "$before" --after . --sku oak --room 0 --slot 2 --out "$output/table" --verify-after "$ref/approved"
node "$review/scripts/render-comparison.mjs" --before "$before" --after . --sku oak --room 0 --slot 0 --out "$output/bookcase"
cmp "$output/table/after/shelf.png" "$ref/approved/shelf.png"
cmp "$output/bookcase/after/room.png" "$ref/approved/room-bookcase.png"
cmp "$output/bookcase/after/shelf.png" "$ref/approved/shelf-bookcase.png"
node --test tests/roomFrameArt.test.js
```
