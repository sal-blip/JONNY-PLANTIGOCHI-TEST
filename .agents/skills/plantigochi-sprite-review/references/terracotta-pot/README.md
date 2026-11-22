# Terracotta nursery pot

The matte red-clay pot has a continuous rolled rim, a shadowed inner wall above the soil and two shallow turning marks on its tapered body. The approved comparison includes the pot empty on the coffee table and planted with a snake plant. [Approval sheet](comparison.png)

The transparent master measures 65 × 67 pixels. Its bottom-center anchor is (32, 60). The renderer adds the contact shadow, raises foliage three grid pixels and applies the room lighting. The shop draws the pot at (33, 50) at 1.85× in a 72 × 64 tile. The 400 × 320 living room draws it at (152, 245) at 0.94× in coffee table slot 4. The review uses noon, reduced motion and an unselected pot. The planted specimen is `nursery-snake-plant` with pot style 0. [Shop tile](approved/shop.png) · [Planted room](approved/room-planted.png)

The five native captures use the room scenery from `6b02735`. The checker draws the empty and planted pots with that backdrop and compares all five images. It also checks how each pot composes with the current room scenery. The editable drawing recipe regenerates the master, which the shared encoder converts into the game's palette and pixel rows. [Drawing recipe](draw-terracotta.py) · [Master](terracotta-pot.png) · [Frozen image hashes](SHA256SUMS)

Run these commands from the game repository root with Node.js 24, Python 3 and Pillow.

```sh
review=.agents/skills/plantigochi-sprite-review
ref="$review/references/terracotta-pot"
out=$(mktemp -d)
python "$ref/draw-terracotta.py" "$out/terracotta-pot.png"
cmp "$out/terracotta-pot.png" "$ref/terracotta-pot.png"
python "$review/scripts/encode-sprite.py" "$out/terracotta-pot.png" src/terracottaPotSprite.js --anchor 32 60 --check
npm ci --prefix "$review/scripts"
node "$ref/verify-planted.mjs" .
```
