# Wild pots · first art review

Stump Cottage, Rain Boot and Ringed Planet were approved for the game. Their shop prices are 34, 24 and 38 Garden Coins respectively. The remaining designs in the ten-pot plan are Moon Rabbit, Sardine Tin, Honeycomb Crock, Pumpkin Coach, Tide Pool, Strawberry Punnet and Patchwork Quilt.

The original SpriteCook strip is in `masters.png`. Run `python docs/art-review/wild-pots-01/encode.py` from the project to regenerate the indexed sprites. Each pot uses the existing four-pass room renderer. Vessel geometry is measured relative to the bottom center. Stump and Planet have centered openings, while Boot roots attach six native pixels to the right over the heel. The same soil offset centers the front rim and the starter Monstera stalks. The existing canopy supplies the sway poses.

[Compare the empty shop art and nine plant fittings](fittings.png). [Check the windowsill in daylight and at night](windowsill.png). Rebuild these boards with `render.py` and the local Vite URL. The boards use the game's own renderers.
