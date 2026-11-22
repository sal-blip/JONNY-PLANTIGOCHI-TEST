# Open-base coffee table

The approved living-room table has a chamfered keyaki top, two matched trestles and open space between their feet. The compact approval board shows the previous lower brace above the open-base design. [Approval comparison](comparison.png)

The room painter mirrors one 23 × 26 native-pixel end support about x194.5. The shoulders, beveled feet and floor contact follow the same geometry at x141 and x248. Window-facing surfaces receive the appropriate light on each end. The teacup remains on the right, with the original plant positions at (152, 245) and (193, 246). [Source painter](../../../../../src/roomScenery.js)

The four frozen 400 × 320 images use the actual living-room renderer at noon and 02:00, with reduced motion and no selection. The occupied captures place a Monstera in the main table slot and a Golden pothos in the center slot. [Empty at noon](approved/room.png) · [Occupied at noon](approved/occupied-room.png) · [Empty at night](approved/night-room.png) · [Occupied at night](approved/night-occupied-room.png)

Run the following from the repository root to compare native pixels in the open base and the full room against all four approved captures.

```sh
review=.agents/skills/plantigochi-sprite-review
npm ci --prefix "$review/scripts"
node "$review/references/coffee-table/verify.mjs"
```
