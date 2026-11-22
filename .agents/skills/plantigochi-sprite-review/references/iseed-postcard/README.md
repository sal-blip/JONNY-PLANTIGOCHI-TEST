# iSEED Postcard

A sprout postage stamp, dark cancellation lines and a folded airmail corner identify Postcard in the five-app launcher. The Postcard painter draws the fifth 48 × 48 cell in the 240 × 48 atlas, starting at x = 192. [Approval comparison](comparison.png) · [Native tile](approved/tile.png) · [Day launcher](approved/launcher.png) · [Night launcher](approved/launcher-night.png)

The source of the editable artwork is the `postcard` painter in the launcher generator. Run the verification command from the repository root with Python and Pillow. It paints the complete atlas in memory, compares it with the packaged artwork and checks the Postcard cell against the approved native pixels. The 390 × 844 launcher captures preserve its appearance at phone scale. [Launcher painter](../../../../../scripts/render-iseed-launcher.py) · [Packaged atlas](../../../../../public/art/iseed-launcher.png)

```sh
python .agents/skills/plantigochi-sprite-review/references/iseed-postcard/verify.py
```
