---
name: plantigochi-sprite-review
description: Design or revise one Plantigochi pixel-art item, render it in the actual garden and shop at phone scale, and carry its approved pixels into the game.
---

# Review one game sprite

Start with one named item. Pick the trait a player should recognize from across the room. For the Golden pothos it was a trailing vine with separated heart-shaped leaves and irregular gold markings. For a different plant, pot or piece of furniture, choose its own defining trait.

1. **Freeze the starting point.** Use a separate checkout of the shipped revision and work on the candidate locally. Choose the same placement, pot, camera, daylight, animation pose and shop tile in both. Use ordinary viewing scale for the room.
2. **Draw at the final pixel grid.** Keep the movable item separate from the room. For foliage, mark the bottom-center pot anchor and crown first. Draw stems behind the leaves, block in distinct silhouettes, then add broad areas of light, shadow and variegation. The approved pothos pass added one small side-facing leaf at the bend so the vine could be followed to its tip. Preserve open spaces at shelf size. For another item, draw the meaningful details of its own materials.
3. **Compare in context.** Render both versions through the game's own room and shop functions. Put the current and proposed views next to each other in the same order, with a magnified detail and a shelf view at normal phone scale. Use nearest-neighbor enlargement. Inspect cropped edges, the contact point, the silhouette against furniture, and the pixels that remain visible at the smallest placement.
4. **Get art direction early.** Show the first pass and ask one concrete question about the visible design. While it is under review, keep it outside the live game. Revise the same item if requested. When the player approves it, freeze the native shop tile and room PNG from that exact pass.
5. **Integrate and verify.** Mount the approved art at the reviewed anchor. Keep the item's identity, lighting, selection outline and placement behavior. For plants, check both vine directions, pot swaps and idle motion with a fixed crown. Compare the neutral production render against the two frozen images pixel for pixel. Run the game's tests and build. Approval covers the item shown.

## Reuse the Golden pothos setup

Run these commands from the game repository root. The comparison tool uses Node.js and its own locked dependencies. The optional drawing and encoding scripts use Python 3 and Pillow.

```sh
review=.agents/skills/plantigochi-sprite-review
npm ci --prefix "$review/scripts"

# Point --before to a separate checkout of the previous artwork.
node "$review/scripts/render-comparison.mjs" \
  --before ../plantigochi-before --after . --sku golden-pothos --room 0 --slot 0 \
  --out /tmp/pothos-review --verify-after "$review/references/golden-pothos/approved"
```

Give each pass a fresh output directory. Open its `comparison.png` for review. For a new design pass, omit `--verify-after` until its reference images have been approved. Point it at the saved native `room.png` and `shop.png` directory when checking the implementation. See `--help` for other item types and placements.

**Exact art setup.** The approved master uses a transparent 65 × 67 grid with the pot's bottom center at (32, 60). The fixed room specimen is `nursery-golden-pothos` with pot style 0. The living-room upper shelf draws it at (55, 96) at 0.78× in a 400 × 320 room at noon. The 72 × 64 shop tile draws it at (32, 54) at 1.15×. The neutral pose uses reduced motion. These measurements belong to this specimen. Use each new item's real display geometry.

**Editable reference.** The drawing recipe records the stroke order, coordinates, masks and palette for this pass. The encoder trims transparent margins while preserving the pot anchor and opaque pixel colors. The game reads the resulting palette and pixel rows directly. [Approved comparison](references/golden-pothos/comparison.png) · [Foliage master](references/golden-pothos-foliage.png) · [Drawing recipe](references/golden-pothos/draw-foliage.py)

```sh
review=.agents/skills/plantigochi-sprite-review
python "$review/references/golden-pothos/draw-foliage.py" /tmp/pothos-foliage.png
python "$review/scripts/encode-sprite.py" /tmp/pothos-foliage.png \
  src/goldenPothosSprite.js --anchor 32 60 --check
```

To encode a revised master in the candidate checkout, run the encoder without `--check`. Preserve the original master and the approved native renders until the comparison passes.
