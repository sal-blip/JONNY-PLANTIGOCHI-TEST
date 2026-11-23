# Garden item resolution study

The v68 garden used a 400-unit-wide room with a 320-unit interior. Its backing canvases extend vertically for portrait. At a 393 × 710 CSS-pixel viewport, the room measured 400 × 723 backing pixels. Each of the two initial rooms mounted a depth and actor canvas. A foreground canvas also appears when an original framed photo needs objects in front of it. Inventory tiles render into 72 × 64 canvases and detail views into 144 × 128. The toy has a scalable interface and a 72 × 40 SVG plant coordinate system. These dimensions describe different parts of the screen. [Room layout](../../../src/Collector.jsx) · [Room layers](../../../src/RoomView.jsx) · [Inventory](../../../src/GardenShop.jsx) · [Toy art](../../../src/PlantPixel.jsx)

## What gets lost in placement

The pot and plant renderer divides size by sprite density, then rounds both ends of each horizontal color run to integer room coordinates. Many authored pixels become less than one room pixel on a shelf. Decorative objects have a similar rounding step. At a placement scale of 0.78 a double-density pot samples each source pixel at only 0.39 room pixels. The same pot’s inventory tile samples it at one tile pixel per source pixel. [Plant and pot renderer](../../../src/roomPlant.js) · [Decor renderer](../../../src/roomShopArt.js) · [Shelf scales](../../../src/gardenLayout.js) · [Preview scales](../../../src/shopPreviewLayout.js)

The table gives measured bounding boxes of opaque pixels in Chromium. It uses daylight, the normal inventory thumbnail, the upper living-room shelf for the pot and plant, and the nearby bookcase decor spot for the cat. The experimental column uses the same art and shelf positions, three samples per room unit, and rounding to the nearest third of a unit at the final draw step. The image enlarges the crops for inspection. Individual shelves, poses and plants have different dimensions.

| Item | Inventory | Garden in v68 | Canvas enlarged 3× | Finer drawing at 3× |
| --- | --- | --- | --- | --- |
| Maneki-neko | 36 × 49 | 14 × 20 | 42 × 60 | 44 × 61 |
| Terracotta pot | 38 × 37 | 14 × 14 | 42 × 42 | 44 × 43 |
| Snake plant | 24 × 52 | 10 × 20 | 30 × 60 | 28 × 61 |

All three canvas-only crops matched a nearest-neighbor enlargement of the current crop byte for byte. The finer drawing recovered the cat’s face, pot rim and leaf stripes from the existing artwork. The v68 postcard rendered at 1200 × 960 and shares the same coordinate rounding.

![Inventory, current placement and two 3× experiments](garden-item-resolution.png)

## Implementation and verification

Version 0.1.9 applies the finer drawing in the last column. The visible room chooses one to three backing pixels per logical unit from display density, room width and focus zoom. Each detailed layer is capped at four million pixels and 4096 pixels high when selecting the scale. Depth, offscreen rooms, and the blurred toy backdrop stay on the original grid. Sprite runs, contours, carried plants, previews, postcards and photo apertures share the final grid. Camera, saved slot addresses and tap targets retain logical coordinates.

A 393 × 710 viewport at 3× device density allocated 1200 × 2169 for the visible actor layer, about 9.9 MiB for one RGBA bitmap. Actual browser memory use includes other layers and caches. Chromium reproduced the three measured crops in the last column and exercised cross-room preview, placement and reload at both 1× and 3× device density. Performance on physical Android and iPhone devices remains to be checked. [Garden walkthrough](../../../tests/browser/garden_resolution.py)
