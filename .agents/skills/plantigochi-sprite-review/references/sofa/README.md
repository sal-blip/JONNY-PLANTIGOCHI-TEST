# Fitted timber sofa

A curved oak crest and two end posts support the upholstered back. Three fitted bays share the opening between the arms. Each outer cushion follows the timber farther forward as the seat widens. Two matching flax pillows have pinched corners, covered buttons and a shaded lower fold. The crest begins at y148 and joins both rear arm posts at their upper ends. The working drawing lives in `sofa(b)` in [roomScenery.js](../../../../../src/roomScenery.js). [Approved comparison](comparison.png)

The artist built the arm profiles around x205. For each cushion row, `armEdge(y)` gives the inside wood edge and `cushionBounds(bay,y)` divides the available width into thirds. The painter draws the cushion faces before the arms, leaving the light-facing timber lip visible over the fabric. The cat paints at (205, 197). Its paws and shadow sit ahead of the center cushion’s back seam. [Noon](approved/room.png) · [Awake cat](approved/awake-room.png) · [Night](approved/night-room.png) · [Awake at night](approved/night-awake-room.png)

The four 400 × 320 captures use room 0, local noon or 02:00, time zero, reduced motion, empty plant and shop placements, and no selection. The verifier draws each through the game and compares every native pixel. Run it from the repository root.

```sh
review=.agents/skills/plantigochi-sprite-review
npm ci --prefix "$review/scripts"
node "$review/references/sofa/verify.mjs"
```

Historical lamp and coffee-table checks use the approved sofa’s 205 × 84 region at (108, 148) to account for the previous furniture and shadow. The table check renders the two plants over both the archived room and the sofa released here. [Lamp proof](../floor-lamp/README.md) · [Coffee-table proof](../coffee-table/README.md)
