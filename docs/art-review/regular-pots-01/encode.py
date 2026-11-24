"""Rebuild the three review sprites from the original transparent SpriteCook strip."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image

review = Path(__file__).resolve().parent
project = review.parents[2]
spec = spec_from_file_location("encoder", project / ".agents/skills/plantigochi-sprite-review/scripts/encode-sprite.py")
encoder = module_from_spec(spec)
spec.loader.exec_module(encoder)
cuts = [
    ('honey-glazed-terracotta', (0, 80, 64, 144), (42, 42)),
    ('blue-willow-porcelain', (74, 82, 143, 144), (46, 42)),
    ('low-sandstone-bowl', (151, 95, 224, 143), (54, 27)),
]
with Image.open(review / "masters.png") as master, TemporaryDirectory() as temp:
    for sku, bounds, size in cuts:
        art = master.convert("RGBA").crop(bounds).resize(size, Image.Resampling.NEAREST)
        alpha = art.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
        # Exclude transparent pixels from the ceramic palette.
        colors = Image.new("RGB", size, art.getpixel((size[0] // 2, size[1] // 2))[:3])
        colors.paste(art.convert("RGB"), mask=alpha)
        sprite = colors.quantize(colors=60).convert("RGBA")
        sprite.putalpha(alpha)
        path = Path(temp) / (sku + ".png")
        sprite.save(path)
        (project / "src/shopSprites" / (sku + ".js")).write_bytes(encoder.encode(path, size[0] // 2, size[1]))
