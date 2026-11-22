"""Compare the Postcard cell in the checked-in and freshly painted iSEED launcher."""
from pathlib import Path
from runpy import run_path
from PIL import Image

ref = Path(__file__).resolve().parent
repo = ref.parents[4]
with Image.open(repo/'public/art/iseed-launcher.png') as atlas:
    runtime = atlas.convert('RGBA')
fresh = run_path(str(repo/'scripts/render-iseed-launcher.py'))['render']().convert('RGBA')
assert runtime.size == fresh.size == (240, 48)
assert fresh.tobytes() == runtime.tobytes(), 'Regenerated atlas differs from the installed launcher atlas'
with Image.open(ref/'approved/tile.png') as tile:
    assert tile.size == (48, 48)
    assert runtime.crop((192, 0, 240, 48)).tobytes() == tile.convert('RGBA').tobytes(), 'Postcard differs from approval'
print('The packaged and regenerated atlases agree and Postcard matches its approved native cell.')
