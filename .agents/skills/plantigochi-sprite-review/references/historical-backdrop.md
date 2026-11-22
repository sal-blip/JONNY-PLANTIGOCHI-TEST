# Recheck artwork approved before the floor lamp

The Golden pothos, snake plant, Maneki-neko and record player approval images include the living room as it looked in revision `580851f`. A full-room comparison includes the furniture behind the subject. The shop tiles use a transparent background and can be checked directly.

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

Each comparison's `before/room.png` renders the installed artwork against the current scenery. To verify the current empty room and the record player inside it, run both checks below. The lamp check compares the complete native room at noon and night. The playback check compares the turntable against its frozen frames, then checks how it paints on each current mount under daytime and nighttime lighting.

```sh
node "$review/references/floor-lamp/verify.mjs"
node "$review/references/record-player/verify-playback.mjs"
```
