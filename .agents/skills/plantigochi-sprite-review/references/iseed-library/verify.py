"""Check the packaged launcher against its editable painter and five approved tiles."""
from pathlib import Path
from runpy import run_path

from PIL import Image


reference = Path(__file__).resolve().parent
repo = reference.parents[4]
paint = run_path(str(repo / 'scripts/render-iseed-launcher.py'))['render']
with Image.open(repo / 'public/art/iseed-launcher.png') as image:
    packaged = image.convert('RGBA')
redrawn = paint()
assert redrawn.size == packaged.size == (240, 48), 'Unexpected iSEED atlas dimensions'
assert redrawn.tobytes() == packaged.tobytes(), 'Packaged and redrawn iSEED atlases differ'

for index, app in enumerate(('shop', 'inventory', 'journal', 'library', 'postcard')):
    with Image.open(reference.parent / f'iseed-{app}' / 'approved/tile.png') as tile:
        approved = tile.convert('RGBA')
    assert approved.size == (48, 48), f'Unexpected {app} reference dimensions'
    cell = packaged.crop((index * 48, 0, (index + 1) * 48, 48))
    assert cell.tobytes() == approved.tobytes(), f'{app} differs from the approved artwork'

print('The iSEED atlas reproduces all five approved launcher tiles.')
