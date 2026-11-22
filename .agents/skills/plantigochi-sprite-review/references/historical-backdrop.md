# Recheck artwork against its original room

The Golden pothos, snake plant, Maneki-neko and record player approval images include the living room as it looked in revision `580851f`. A full-room comparison includes the furniture behind the subject. The shop tiles use a transparent background and can be checked directly. The blue wave pot was approved later, on the room from `adced93`, before the open coffee table. [Blue wave pot checks](blue-wave-pot/README.md)

To check the current subjects against their frozen room images, copy the current source to a temporary directory and give it the original scenery module. The comparison tool will still use the current shop layout, sprites, paint order and item placements.

Run from the game repository root with Node.js 24. The final two commands compare the smaller bookcase mounts.

```sh
review=.agents/skills/plantigochi-sprite-review
npm ci --prefix "$review/scripts"
output=$(mktemp -d)
subject="$output/subject"
mkdir "$subject"
cp -R src package.json "$subject/"
git show 580851f:src/roomScenery.js > "$subject/src/roomScenery.js"

for spec in 'golden-pothos golden-pothos 0' 'snake-plant snake-plant 3' 'neko maneki-neko 2' 'record record-player 2'
do
  set -- $spec
  node "$review/scripts/render-comparison.mjs" --before . --after "$subject" \
    --sku "$1" --room 0 --slot "$3" --out "$output/$1" \
    --verify-after "$review/references/$2/approved" || exit 1
done

for spec in 'neko maneki-neko' 'record record-player'
do
  set -- $spec
  node "$review/scripts/render-comparison.mjs" --before . --after "$subject" \
    --sku "$1" --room 0 --slot 0 --out "$output/$1-bookcase" || exit 1
  cmp "$output/$1-bookcase/after/room.png" "$review/references/$2/approved/bookcase.png" || exit 1
done
```

Each comparison’s `before/room.png` renders the current subject against today’s scenery. The lamp’s historical captures include the previous table. Its checker compares the illuminated area with those original pixels. The table supplies full-room images at noon and night with its two plant mounts empty and occupied. Its checker reproduces the archived plant compositions, then substitutes the approved sofa region for a second full-scene check against today’s game. The four sofa references cover the resting and awake cat under both lights. [Sofa](sofa/README.md) The wave pot and record player also use the earlier room imagery to isolate their subjects, then check them through the current renderer. [Lamp](floor-lamp/README.md) · [Open coffee table](coffee-table/README.md) · [Blue wave pot](blue-wave-pot/README.md) · [Record player](record-player/README.md)

```sh
node "$review/references/sofa/verify.mjs"
node "$review/references/floor-lamp/verify.mjs"
node "$review/references/coffee-table/verify.mjs"
node "$review/references/blue-wave-pot/verify-planted.mjs" .
node "$review/references/record-player/verify-playback.mjs"
```
