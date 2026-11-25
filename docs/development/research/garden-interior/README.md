# Garden interior art audit

Baseline: game source at `3c89282`. The living room and plant studio are the two authored room layouts. Later suites repeat them. The Cutting Jar and Leaf Book have interactive instances in the first suite only. This audit covers indoor objects, fittings, floor and ceiling. Wall surfaces and outdoor scenery are outside the art brief. The camera, iSEED interface and toy are consumers or separate screens.

[Current interior reference sheet](interior-references.png) · [All 55 placeable designs and their native dimensions](placeables.csv) · [Room composition](../../../../src/roomArt.js) · [Room layout and saved addresses](../../../../src/gardenLayout.js)

## What to draw first

Start with the **cane basket, cup and saucer, and brush beaker**. All three have recognizable silhouettes and sit on different surfaces. The current renderer paints each into its supporting furniture. This pass tests whether the new art can hold its detail at room size, appear to rest on the same surface, and leave the furniture intact when a player zooms in. The first row of the reference sheet shows their current pixels, including a little supporting surface.

The sheet contains 18 reference views rendered from the current drawing functions in daylight. Some views show a whole assembly and others a detail of that same assembly. The enlargement varies by cell. Use the actual room to judge relative size. Earlier approved views are available for comparison. [Historical furniture approvals](../../../../.agents/skills/plantigochi-sprite-review/references)

## Interior list and proposed passes

Each row is a three-item approval pass. Paired drapes, a cup with its saucer and other parts that belong together count as one design brief each. A pass is a proposal for review. Where the existing art already reads well, keeping it is an option.

| Pass | Assets | Source and details to preserve |
| --- | --- | --- |
| 1 · Small objects | Cane basket; teacup with saucer; celadon beaker with three brushes | Embedded in `bookcase`, `coffee`, and `studioDesk`. Keep both handle joins on the basket, the shared center of the cup and saucer, and brush tips emerging from inside the rim. |
| 2 · Seating and light | Living-room sofa with seat, back and two throw pillows; studio stool; paper floor lamp | `sofa`, `studioDesk`, `lamp`. Preserve the cat’s seat, cushion-to-arm contact, stool feet and the connection between lamp shade and shaft. Capture the lamp at noon and after dark. |
| 3 · Main placement furniture | Cedar bookcase; coffee table; drawing desk with drawers | `bookcase`, `coffee`, `studioDesk`. Preserve three shelf levels, both table positions per room and the foreground edges. The studio renderer offsets the desk vertically by 12 logical pixels. |
| 4 · Smaller supports | Two bracketed studio shelves; studio cabinet with draped cloth; freestanding display table | `studioShelves`, `cabinet`, and `drawDecor`. Keep cabinet cloth off the placement point. The display table appears with a decoration in the stand slot in either room. |
| 5 · Floor textiles | Indigo living-room rug; striped studio rug; small round woven floor mat | `rug`, `studioMat`, `floorMat`. Keep the rugs’ perspective and fringe. The small mat has two colorways and a stable footprint under a floor plant. |
| 6 · Interactive residents | Cutting Jar and its dedicated shelf; Leaf Book; sofa cat | Jar has five states (empty plus four cutting stages). Book has two covers/states depending on whether it holds leaves. Cat sleeps, wakes, blinks, breathes and lifts its tail. Preserve hit areas and attached paws/tail through the motion. |
| 7 · Hanging objects | Pendulum clock; apron with peg rail; paired ginkgo and fern prints | `passage`, `hangingPrints`. These are indoor objects mounted on the wall. Clock hands and pendulum are currently static. Include the rail and clips with the prints. |
| 8 · Studio art and window textiles | Easel with camellia painting; pair of living-room curtains; studio roll blind with weighted cord | `easel`, `windowFrame`. Keep the painted board seated between tray and clamp. Curtain tops stay fixed as the hems move. The studio blind has a static woven panel and cord. |
| 9 · Window fittings | Living-room sash and sill; studio sash and sill; glass wind chime and paper sail | `windowFrame`. Keep two different sash layouts and transparent openings. Each sill carries three plant positions and a separate decor point. The sail moves from its suspension point. |
| 10 · Shelf dressing | Upright and leaning book groups; paper stacks and slim bookcase-top bundle; handled storage box in the bottom bookcase bay | `book`, `paperStack`, `bookcase`, `studioShelves`. These are embedded details. Keep repeated books and papers reusable, preserve clear space for placed objects, and review the box separately from the bookcase frame. |

[Scenery drawing functions](../../../../src/roomScenery.js) · [Keepsake art and state](../../../../src/roomKeepsakes.js) · [Cat poses](../../../../src/roomCat.js) · [Display stands and frames](../../../../src/roomShopArt.js)

**Floor, ceiling and light.** The wood floor and ceiling planks and beams extend to fill tall viewports. Board spacing changes with depth and seams run between adjacent rooms. If refreshed, these need repeating, aligned materials checked across a room swipe and a tall camera capture. Keep the window light on the floor, floating dust, lamp glow, and time-of-day tint as runtime effects so they track the room lighting. A single flattened room image would lose that behavior. [Depth planes and lighting](../../../../src/roomScenery.js)

## Placeables already in the art pipeline

| Family | Verified count | What the later art pass needs |
| --- | ---: | --- |
| Mature garden plants | 41 | 32 species in seed progression and nine additional current shop plants. Forty have native atlas crowns. The starter Monstera draws its canopy in code and needs a rendered baseline if it gets a master. Seven retired shop entries refer to species still in progression and remain drawable in older saves. |
| Pots | 10 | All ten have native cutouts. Terracotta also supplies the default pot for an unpotted garden resident. Keep the soil center and front rim registered for pot swaps. |
| Photo frames | 2 | Oak and lacquer each have a native cutout and a separately positioned player-photo aperture. Test with an actual photo, including the floor layer crossing in front of it. |
| Other movable decorations | 2 | Maneki-neko and record player both have native cutouts. Maneki-neko is distinct from the sofa cat. The record player’s label animates during playback. |

The CSV lists every ID once with its current acquisition route, native width and height where available. Counts were cross-checked against the shop catalog, seed progression, plant/pot renderer and all **54** entries in the native region map. The existing atlas is a source for **40 plant crowns, 10 pots and 4 decorations**. Reuse those masters when the change is limited to fitting, occlusion or placement. [Catalog](../../../../src/gardenEconomy.js) · [Seed progression](../../../../src/game.js) · [Region map](../../../../src/shopSprites/native-regions.json) · [Original resolution study](../garden-item-resolution.md)

## What to check before replacing art

- **Furniture.** Export the prop and its supporting surface separately when both are being redrawn. Remove the prop’s original drawing when its replacement is integrated. Retain the existing surface heights, clipping bounds and saved slot addresses. Test a tall plant, a trailing vine and a frame beside each changed support.
- **Plants and pots.** Use the existing four-layer order: pot back, stalk, pot front, foliage. Lock the soil socket to the pot. Animate the plant parts. Check a skirt of trailing leaves, a plant seated at soil level, and a tall upright specimen in both the shallow bowl and the Bog Frog Pot. [Composition and placement specification](../../interface-and-art.md#pot-and-plant-composition)
- **Stateful art.** Capture the required key poses and a reduced-motion still before the redraw. Keep the lamp glow, glass transparency, photo content and record label independently drawable. Preserve the cat’s contact shadow and avoid painting a second shadow into the sprite.
- **Approval.** Compare the existing and proposed art at the same spot in daylight and at night, at ordinary phone size and focused zoom. Check both the live room and a Share camera capture. For changes to large furniture surfaces, repeat the swipe between rooms and back from iSEED to catch cache or frame-rate regressions.
