# Maneki-neko build notes

The player approved the symmetry revision shown on the right of the comparison. The left column shows the previous porcelain preview. Use the right column and the native PNGs to check later edits. [Approval board](comparison.png) · [Shop tile](approved/shop.png) · [Sofa-side table](approved/room.png) · [Bookcase](approved/bookcase.png)

## Shape and material

The transparent master is **33 × 37 pixels**. All coordinates below start at the top-left of that master. The placement anchor sits just below the feet at **(17, 35)**. The face, chest, bell and coin line up at **x = 17**.

| Feature | Approved geometry |
| --- | --- |
| Ears | Both tips reach row 2. The left spans x = 10–11 and the right spans x = 23–24. The right ear carries an indigo glaze mark. |
| Face | The cheeks span x = 7–27 at their widest. The eye arcs sit on the same row. The nose tapers to (17, 14), with a muzzle pad on each side. |
| Body | Mirror the underlying torso and haunch outlines around x = 17. Both feet meet row 34, at x = 7–12 and x = 22–27. |
| Gesture | Preserve the raised paw's turned-under toes and connection to its shoulder. The lower forepaw overlaps the upper-right rim of the plum-blossom coin. |
| Glaze | Light comes from the upper left. The body masks are symmetrical while each side has its own light and shadow. |

The recipe paints the body at its final resolution and uses the earlier porcelain study for the two forepaws. Both source files are included. All color and alpha values are fixed before the game applies room lighting or its selection outline. [Drawing recipe](draw-porcelain.py) · [Paw study](paw-study.png) · [Editable native master](porcelain.png)

## Rebuild and check

Run from the repository root with Python 3, Pillow and Node.js. The first two commands after the variables rebuild the master and compare its encoding with the checked-in sprite.

```sh
review=.agents/skills/plantigochi-sprite-review
ref="$review/references/maneki-neko"
out=$(mktemp -d)

python "$ref/draw-porcelain.py" "$out/porcelain.png"
python "$review/scripts/encode-sprite.py" "$out/porcelain.png" src/manekiNekoSprite.js --anchor 17 35 --check
npm ci --prefix "$review/scripts"
```

The approval used the original room scenery. The native verification checks the shop tile, the sofa-side table at slot 2 and the bookcase at slot 0 with that scenery, then renders each mount against the current room. [Recheck the historical captures](../historical-backdrop.md)

The shop draws the cat at (32, 57) and 1.65× in a 72 × 64 tile. The sofa-side table draws it at (317, 240) and 1× in the 400 × 320 living room. The top of the bookcase is (77, 46) at 0.83×. Check the resting paws against each surface, then check the existing selection outline and night tint. Store and inventory use the same room-art renderer. [Renderer](../../../../../src/roomShopArt.js) · [Encoded sprite](../../../../../src/manekiNekoSprite.js)
