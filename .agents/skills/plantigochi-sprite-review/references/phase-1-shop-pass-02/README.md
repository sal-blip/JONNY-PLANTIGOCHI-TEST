# Approved launch shop art

The player approved all eleven sprites. The existing eight products retain their shop IDs. Hoya serpens “Splash”, Queen Anthurium and Monkey Tail Cactus are new catalog entries.

- `source/` holds the original SpriteCook exports. The manifest records their asset IDs and file hashes.
- `sprites/` holds the isolated pixel masters. Hoya and Anthurium foliage is separate from the stock pots. The Monkey Tail master includes the terracotta pot.
- `tiles/` holds the exact approved 72 × 64 shop images.
- `preview/` shows the artwork rendered in the game’s room canvases, including the two photo frames using sample photos.

Run `python encode-approved.py` from this folder to rebuild the indexed art, or add `--check` to verify it. Keep a trailing plant's baseline at its pot foot. The encoder also splits out the foliage for repotting and scales the three new trailing plants for legibility in the room. Their original 72 × 64 tiles remain the reference for the shop and inventory.

The Monkey Tail Cactus has long, fleshy stems under dense white hair-like spines, with a small tubular flower at the side of one stem. [RHS profile](https://www.rhs.org.uk/plants/327556/cleistocactus-colademononis/details) · [Species photographs](https://www.llifle.info/Encyclopedia/CACTI/Family/Cactaceae/9578/Cleistocactus_colademononis)

The [Bhutan Biodiversity Portal's Hoya serpens entry](https://biodiversity.bt/species/show/1374) and [NParks' Queen Anthurium entry](https://www.nparks.gov.sg/florafaunaweb/flora/7/0/7092) are the references for leaf shape. When adding a trailing plant, check the pot-rim anchor and depth clipping on all eligible surfaces. Maintain the owned pot, uploaded frame aperture and record animation when approving an existing product redraw.
