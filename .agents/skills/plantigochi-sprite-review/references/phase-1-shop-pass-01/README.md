# Phase 1 Shop art review, pass 01

Monstera Albo, Pink Micans, Bog Frog Pot and Lava Pop Pot are approved. SpriteCook Pixel Engine generated the three 52 × 52 foliage inputs. The foliage is separate from the game pots.

- Monstera Albo uses the SpriteCook PNG.
- Pink Micans uses the SpriteCook palette with redrawn heart-shaped leaves.
- The first Monkey Tail Cactus master is kept here for reference. The player requested a botanically accurate redraw before it goes into the catalog.
- The two approved pot masters use a 48 × 48 grid and draw at half resolution in the garden.

The foliage masters are in `foliage/`. The SpriteCook source images that were changed are in `source/`. The manifest identifies the original SpriteCook exports. The `preview/` folder contains the original review tiles and living room. Production uses double-density art. Resize the foliage with nearest-neighbor sampling to twice its approved scale from `preview/placement.json`, align the crown to native `(64, 92)` in a 130 × 134 grid, then encode with anchor `(64, 120)`. For the pot masters, encode at native size with anchor `(24, 48)`.
