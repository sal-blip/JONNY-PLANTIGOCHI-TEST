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
5. **Integrate and verify.** Mount the approved art at the reviewed anchor. Keep the item's identity, lighting, selection outline and placement behavior. For plants, check both vine directions, pot swaps and idle motion with a fixed crown. Compare the neutral production render against the two frozen images pixel for pixel. Run the game's tests and build. Approval covers the item shown. If another draft exists when approval arrives, rebuild against the exact native captures used in the preview the player approved.

For plant or pot work, use the [four-layer composition and movement specification](../../../docs/development/interface-and-art.md#pot-and-plant-composition). Share each new pass as it is rendered, including the centered still, sway keyframes and in-pot review.

## Reuse the Golden pothos setup

Run these commands from the game repository root. The comparison tool uses Node.js and its own locked dependencies. The optional drawing and encoding scripts use Python 3 and Pillow.

```sh
review=.agents/skills/plantigochi-sprite-review
npm ci --prefix "$review/scripts"

# Point --before to a separate checkout of the previous artwork.
node "$review/scripts/render-comparison.mjs" \
  --before ../plantigochi-before --after . --sku golden-pothos --room 0 --slot 0 \
  --out /tmp/pothos-review
```

Give each pass a fresh output directory. Open its `comparison.png` for review. For a frozen reference that shares the same room scenery, pass `--verify-after` and the directory containing its native `room.png` and `shop.png`. The original pothos, snake plant, Maneki-neko and record player approvals predate the floor lamp. The lamp and Blue wave pot approvals predate the open-base table. [Historical room and shop checks](references/historical-backdrop.md) · [Current lamp scenery check](references/floor-lamp/verify.mjs) · [Record player playback and placement check](references/record-player/verify-playback.mjs) See `--help` for other item types and placements.

**Exact art setup.** The approved master uses a transparent 65 × 67 grid with the pot's bottom center at (32, 60). The fixed room specimen is `nursery-golden-pothos` with pot style 0. The living-room upper shelf draws it at (55, 96) at 0.78× in a 400 × 320 room at noon. The 72 × 64 shop tile draws it at (32, 54) at 1.15×. The neutral pose uses reduced motion. These measurements belong to this specimen. Use each new item's real display geometry.

**Editable reference.** The drawing recipe records the stroke order, coordinates, masks and palette for this pass. The encoder trims transparent margins while preserving the pot anchor and opaque pixel colors. The game reads the resulting palette and pixel rows directly. [Approved comparison](references/golden-pothos/comparison.png) · [Foliage master](references/golden-pothos-foliage.png) · [Drawing recipe](references/golden-pothos/draw-foliage.py)

```sh
review=.agents/skills/plantigochi-sprite-review
python "$review/references/golden-pothos/draw-foliage.py" /tmp/pothos-foliage.png
python "$review/scripts/encode-sprite.py" /tmp/pothos-foliage.png \
  src/goldenPothosSprite.js --anchor 32 60 --check
```

To encode a revised master in the candidate checkout, run the encoder without `--check`. Preserve the original master and the approved native renders until the comparison passes.

## Snake plant reference

The five Laurentii blades use a 65 × 67 transparent grid anchored at (32, 60). The neutral nursery specimen uses pot style 0 on the living-room windowsill (258, 139) at 0.86×. Its native shop anchor is (36, 57) at 1×. The drawing recipe preserves each blade’s fold, irregular crossbands and pale margins. [Drawing recipe](references/snake-plant/draw-snake.py) · [Foliage master](references/snake-plant/foliage.png) · [Approved shop tile](references/snake-plant/approved/shop.png) · [Approved room](references/snake-plant/approved/room.png)

```sh
review=.agents/skills/plantigochi-sprite-review
python "$review/references/snake-plant/draw-snake.py" /tmp/snake-foliage.png
python "$review/scripts/encode-sprite.py" /tmp/snake-foliage.png src/snakePlantSprite.js --anchor 32 60 --check
node "$review/scripts/render-comparison.mjs" \
  --before ../plantigochi-before --after . --sku snake-plant --room 0 --slot 3 \
  --out /tmp/snake-review
```

## Sculpted objects and launcher icons

For a seated figurine, place its weight-bearing feet first. Mark the face and chest centerline, then block the head, rib cage and haunches. Check the two sides on the native grid before painting an asymmetric gesture. Give the paw a visible connection to the shoulder and a bend at the wrist. Paint the lit and shaded sides separately to preserve the volume of glazed ceramic. Review the silhouette on a real table and on a smaller shelf. [Maneki-neko recipe, anchors and verification](references/maneki-neko/README.md)

For furniture with paired supports, draw the weight-bearing profile once and use it at both ends. Align matching feet and shoulders at the same heights. Apply window light after establishing the shape. Compare both supports side by side at the same magnification, then inspect the full table at phone scale with its plant positions occupied. [Approved open-base coffee table](references/coffee-table/README.md)

For timber arms beside upholstery, check both shapes before they are painted over one another. A cushion seam can disappear under an arm even when the outer frame is mirrored. Size each cushion from the visible opening at its depth. The upholstery face reaches the inside lip of the arm, then widens toward the front post. An exposed strip of wood can still look like a gap, even when every pixel is opaque. Inspect the shaded fabric-to-wood seam at the same height on both sides. At room size with the occupant visible, the backrest should be recognizable above the loose cushions and connect to both side supports.

For an iSEED launcher icon, inspect the native atlas cell and the icon inside the phone launcher. The Shop sign and the wooden plank behind it were separate parts of the design. When revising a layered icon, identify the part to edit and compare neighboring cells too. [Approved Shop cell](references/iseed-shop/approved/tile.png) · [Approved Inventory cell](references/iseed-inventory/approved/tile.png) · [Launcher drawing source](../../../scripts/render-iseed-launcher.py)

When reviewing a picture frame, compare the shop tile and a real uploaded photo. Check both the 72 × 64 tile and the enlarged inventory tile for clear margins around the backing foot. In the room, the aperture in the pixel art and the original-image overlay must coincide during camera zoom. [Oak frame reference](references/oak-photo-frame/README.md)

For artwork held by a clamp, check the points where the board meets the top jaw and lower shelf, including against a similarly colored wall at noon. For a postage stamp on a launcher tile, review the stamp silhouette with the rest of the launcher visible. [Studio easel](references/studio-easel/README.md) · [Postcard](references/iseed-postcard/README.md)
