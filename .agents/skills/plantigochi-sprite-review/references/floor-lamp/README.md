# Floor-supported washi lantern

The approved lamp stands beside the sofa in the living room. Its paper shade narrows into a flared brass socket, which bears on a cypress standard and a turned walnut foot. The upper cap sits flush. [Approved comparison](comparison.png) · [Native noon room](approved/room.png) · [Native night room](approved/night-room.png)

The 37 × 37 shade starts at y112. Its lower paper hoop and socket shoulders meet at y146. Across y147–148 the socket spans x339–355. It tapers symmetrically to the five-pixel shaft at x345–349. The center pixel at x347 stays occupied from the top cap at y111 through the bottom of the foot at y222. The renderer uses odd-width centered spans for the load-bearing parts, with paper, brass and cypress lit separately. The sprite is painted by the room between the window occupants and the sofa. [Source painter](../../../../../src/roomScenery.js)

The references come from the neutral 400 × 320 living room at 12:00 and 02:00, with reduced motion, no selection and no purchased items placed. The comparison enlarges the socket with nearest-neighbor scaling. Run the following from the repository root to compare decoded native pixels at the socket, foot and full-room level.

```sh
review=.agents/skills/plantigochi-sprite-review
npm ci --prefix "$review/scripts"
node "$review/references/floor-lamp/verify.mjs"
```
