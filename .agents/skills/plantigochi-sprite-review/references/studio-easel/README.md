# Studio easel

Two front feet land at the same depth beneath the clamped canvas. The midpoint of each foot is at studio x = 313 and 369 on row 231. The rear foot lands at (348, 216). A fine twig carries a vermilion camellia, bud and four leaves across the cream board. The easel and the painting use the studio’s day and night lighting. [Approval comparison](comparison.png) · [Noon](approved/easel.png) · [Night](approved/night-easel.png) · [Editable painting](camellia-study.png)

The game draws the beech A-frame and the cropped painting in `easel` and `camelliaStudy`. The painting recipe recreates the 49 × 49 transparent master. Its optional `--rows` output is the indexed JavaScript declaration for the scenery painter. [Scenery source](../../../../../src/roomScenery.js)

From the repository root, run the following checks with Python, Pillow and the skill’s locked Node dependencies. The room proof renders studio 1 at noon and 02:00 with the same fixed camera, empty placements and reduced motion used in the review.

```sh
review=.agents/skills/plantigochi-sprite-review
ref="$review/references/studio-easel"
output=$(mktemp -d)
python "$ref/draw-camellia.py" "$output/study.png" --rows "$output/study.js"
cmp "$output/study.png" "$ref/camellia-study.png"
npm ci --prefix "$review/scripts"
node "$ref/verify.mjs"
```
