"""Build indexed room foliage from the two SpriteCook masters."""
from pathlib import Path
import runpy
from tempfile import TemporaryDirectory

from PIL import Image, ImageColor

here = Path(__file__).resolve().parent
skill = here.parents[1]
encode = runpy.run_path(str(skill / "scripts/encode-sprite.py"))["encode"]
output = skill.parents[2] / "src/shopSprites"
# Reserve inks for the few blue and orange pixels of Strelitzia and the
# golden lips of Phalaenopsis. Frequency-based reduction drops those details.
inks = """
201e22 362c30 543542 773845 193e21 284a2a 366638 4d7f42
63954c 7ca35d 95b46b bacb8e 3e4828 647747 8e9255 c3b873
b95319 f16b0e f99a19 ffc458 294480 456ab4 7394cb 382631
582d46 74405b 985b84 b7759f d695bf eeb3d9 f6d3ea ffebee
902773 bc348f de53ae f397c6 cc891e f5c552
""".split()
palette = Image.new("P", (1, 1))
rgb = [ImageColor.getrgb("#" + ink) for ink in inks]
palette.putpalette([channel for color in rgb + [rgb[0]] * (256 - len(rgb)) for channel in color])
with TemporaryDirectory() as temp:
    for sku in ("bird-of-paradise", "moth-orchid"):
        source = Image.open(here / f"{sku}.png").convert("RGBA")
        # Both masters have a centered basal crown. Preserve that origin and
        # snap to the room's double-density grid, including the soil overlap.
        crop = source.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
        source = source.crop(crop)
        source = source.resize((round(76 * source.width / source.height), 76), Image.Resampling.NEAREST)
        opaque = source.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
        indexed = source.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
        indexed.putalpha(opaque)
        path = Path(temp) / f"{sku}.png"
        indexed.save(path)
        (output / f"{sku}.js").write_bytes(encode(path, indexed.width // 2, indexed.height + 26))
