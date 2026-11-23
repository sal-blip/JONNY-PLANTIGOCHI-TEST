# Garden item resolution study

The live garden uses a 400-unit-wide room with a 320-unit interior. Its backing canvases extend vertically for portrait. At a 393 × 710 CSS-pixel viewport, the room measured 400 × 723 backing pixels. Each of the two initial rooms mounted a depth and actor canvas. A foreground canvas also appears when an original framed photo needs objects in front of it. Inventory tiles render into 72 × 64 canvases and detail views into 144 × 128. The toy has a scalable interface and a 72 × 40 SVG plant coordinate system. These dimensions describe different parts of the screen. [Room layout](../../../src/Collector.jsx) · [Room layers](../../../src/RoomView.jsx) · [Inventory](../../../src/GardenShop.jsx) · [Toy art](../../../src/PlantPixel.jsx)

## What gets lost in placement

The pot and plant renderer divides size by sprite density, then rounds both ends of each horizontal color run to integer room coordinates. Many authored pixels become less than one room pixel on a shelf. Decorative objects have a similar rounding step. At a placement scale of 0.78 a double-density pot samples each source pixel at only 0.39 room pixels. The same pot’s inventory tile samples it at one tile pixel per source pixel. [Plant and pot renderer](../../../src/roomPlant.js) · [Decor renderer](../../../src/roomShopArt.js) · [Shelf scales](../../../src/gardenLayout.js) · [Preview scales](../../../src/shopPreviewLayout.js)

The table gives measured bounding boxes of opaque pixels in Chromium. It uses daylight, the normal inventory thumbnail, the upper living-room shelf for the pot and plant, and the nearby bookcase decor spot for the cat. The experimental column uses the same art and shelf positions, three samples per room unit, and rounding to the nearest third of a unit at the final draw step. The image enlarges the crops for inspection. Individual shelves, poses and plants have different dimensions.

| Item | Inventory | Garden today | Canvas enlarged 3× | Finer drawing at 3× |
| --- | --- | --- | --- | --- |
| Maneki-neko | 36 × 49 | 14 × 20 | 42 × 60 | 44 × 61 |
| Terracotta pot | 38 × 37 | 14 × 14 | 42 × 42 | 44 × 43 |
| Snake plant | 24 × 52 | 10 × 20 | 30 × 60 | 28 × 61 |

All three canvas-only crops matched a nearest-neighbor enlargement of the current crop byte for byte. The finer drawing recovered the cat’s face, pot rim and leaf stripes from the existing artwork. The postcard currently renders at 1200 × 960 and shares the same coordinate rounding.

![Inventory, current placement and two 3× experiments](garden-item-resolution.png)

## Proposed first pass

1. Retain the current room geometry, camera, CSS dimensions, placement anchors and slot IDs. Select the backing resolution from the rendered width and device pixel ratio, capped at three samples per unit.
2. Upgrade the visible actor canvas first. Quantize sprite runs to backing pixels at draw time. Apply the same scale to selection outlines, lifted plants, placement previews and postcard rendering. Leave HTML hit targets in room coordinates.
3. Keep the existing scenery cache initially. Increasing a cached bitmap alone preserves its old grid. Check front/back occlusion, photo apertures, extending floor and ceiling, parallax and camera zoom before changing any scenery layers. Preserve original framed photos on their independent layer.
4. Test the two rooms with full shelves, a trailing plant, a framed photo and active animations on Android and iPhone. Compare at normal zoom and during panning, watch frame time and canvas memory, and evaluate 2× on lower-density screens. A single 400 × 723 RGBA buffer is about 1.1 MiB. At 1200 × 2169 it is about 9.9 MiB, excluding browser overhead and caches. Allocate larger buffers only where the extra pixels are visible. Redraw individual assets only where tests identify missing source detail.

The 3× change is a local rendering experiment. On-device performance and the full layered room have yet to be measured at that setting.
