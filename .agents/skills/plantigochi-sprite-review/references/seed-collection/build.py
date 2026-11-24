"""Convert separated SpriteCook foliage to the room renderer's anchored palette rows."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import json
import runpy
from PIL import Image

here = Path(__file__).resolve().parent
skill = here.parents[1]
encode = runpy.run_path(str(skill / "scripts/encode-sprite.py"))["encode"]
output = skill.parents[2] / "src/shopSprites"
sheets = [
    ("first", "0bf5d015-2677-4937-9ebe-636e99896e7c", [0,78,154,236],
     [("variegated-billie",73),("pink-princess",66),("thai-constellation",72)]),
    ("second", "8d47103e-5279-4baa-8066-fd465b029c9e", [0,83,154,234],
     [("raven-zz",65),("polka-dot-begonia",72),("pearls-and-jade",55)]),
    ("third", "f42fc4dd-0530-4f70-a81a-2f2822c1e830", [0,94,192],
     [("pink-diamond",67),("prayer-plant",56)])
]
manifest = []
with TemporaryDirectory() as temp:
    for sheet, asset_id, bounds, plants in sheets:
        path = here / (sheet + ".png")
        source = Image.open(path).convert("RGBA")
        manifest.append(dict(asset_id=asset_id, sha12=hashlib.sha256(path.read_bytes()).hexdigest()[:12],label=sheet))
        for i,(species,height) in enumerate(plants):
            piece = source.crop((bounds[i],0,bounds[i+1],source.height))
            piece = piece.crop(piece.getchannel("A").getbbox())
            piece.thumbnail((98,height),Image.Resampling.NEAREST)
            alpha = piece.getchannel("A")
            # Weight the crown at the basal stems where the pot will meet the plant.
            roots = [x for x in range(piece.width) for y in range(piece.height-3,piece.height) if alpha.getpixel((x,y))]
            anchor = round(sum(roots)/len(roots)) if roots else piece.width//2
            sprite = piece.quantize(48,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert("RGBA")
            sprite.putalpha(alpha)
            png = Path(temp) / (species + ".png")
            sprite.save(png)
            (output / (species+".js")).write_bytes(encode(png,anchor,sprite.height+24))
(here / "spritecook-assets.json").write_text(json.dumps(manifest,indent=2)+"\n")
