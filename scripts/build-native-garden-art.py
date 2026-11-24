"""Pack approved, unquantized masters without changing in-game mount coordinates."""
import ast
import json
import runpy
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import find_objects, label

root = Path(__file__).resolve().parents[1]
refs = root / '.agents/skills/plantigochi-sprite-review/references'
review = root / 'docs/art-review'
assets = {}


def read(path):
    return Image.open(path).convert('RGBA')


def trim(image):
    return image.crop(image.getchannel('A').getbbox())


def strip(path, edges, names):
    sheet = read(path)
    for left, right, name in zip(edges, edges[1:], names):
        assets[name] = trim(sheet.crop((left, 0, right, sheet.height)))


collection = refs / 'seed-collection'
strip(collection/'first.png', [0,78,154,236], ['variegated-billie','pink-princess','thai-constellation'])
strip(collection/'second.png', [0,83,154,234], ['raven-zz','polka-dot-begonia','pearls-and-jade'])
strip(collection/'third.png', [0,94,192], ['pink-diamond','prayer-plant'])
early = refs / 'phase-1-shop-pass-01'
for name in ('monstera-albo', 'pink-micans'):
    assets[name] = trim(read(early/'foliage'/f'{name}.png'))
for name in ('bird-of-paradise','moth-orchid'):
    assets[name] = trim(read(refs/'launch-flowering-plants'/f'{name}.png'))

nursery = refs/'phase-1-shop-pass-02'
approved = runpy.run_path(str(nursery/'encode-approved.py'))
for name in approved['ROOM_MASTERS']:
    assets[name] = approved['master_foliage'](name)[0]
# Keep the approved separation of the cactus and its nursery ceramic.
cactus = trim(read(nursery/'source/cactus.png'))
tile = read(nursery/'tiles/monkey-tail-cactus.png')
mask = approved['foliage_for']('monkey-tail-cactus', tile).getchannel('A').crop(tile.getbbox())
alpha = np.minimum(np.array(cactus.getchannel('A')), np.array(mask.resize(cactus.size, Image.Resampling.NEAREST)))
cactus.putalpha(Image.fromarray(alpha))
assets['monkey-tail-cactus'] = trim(cactus)
strip(nursery/'source/ceramics.png', [0,70,138,211], ['terra','wave','oak'])
strip(nursery/'source/keepsakes.png', [0,69,131,200], ['lacquer','neko','record'])

sheet = read(review/'new-seeds/mature.png')
for name, box in [('venus-flytrap',(1,32,83,119)), ('cape-sundew',(83,27,159,106)),
                  ('white-top-pitcher',(163,15,240,119))]:
    image = sheet.crop(box)
    if name == 'venus-flytrap':
        # Preserve the approved foreshortening of the hanging front trap.
        crown = 84-box[1]
        front = image.crop((0,crown,image.width,image.height))
        front = front.resize((front.width,round(front.height*.56)),Image.Resampling.LANCZOS)
        image = image.crop((0,0,image.width,crown+front.height))
        image.paste(front,(0,crown))
    assets[name] = trim(image)

ids = list(json.loads((root/'src/collectorSeeds.json').read_text()))
for group in range(7):
    image = np.array(read(review/f'collector-twenty/group-{group+1}.png'))
    labels, _ = label(image[:,:,3]>100, np.ones((3,3)))
    pieces = [(bounds,k) for k,bounds in enumerate(find_objects(labels),1)
              if bounds and np.count_nonzero(labels[bounds]==k)>80]
    pieces.sort(key=lambda p:p[0][1].start)
    for name,(bounds,k) in zip(ids[group*3:group*3+3],pieces,strict=True):
        crop = image[bounds].copy()
        crop[:,:,3] *= labels[bounds]==k
        assets[name] = Image.fromarray(crop)

for folder in ('regular-pots-01','wild-pots-01'):
    instructions = ast.parse((review/folder/'encode.py').read_text())
    cuts = next(ast.literal_eval(n.value) for n in instructions.body
                if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='cuts' for t in n.targets))
    sheet = read(review/folder/'masters.png')
    for name,box,_ in cuts:
        assets[name] = sheet.crop(box)
for name in ('bog-frog-pot','lava-pop-pot'):
    assets[name] = trim(read(early/'pots'/f'{name}.png'))

# A transparent gutter isolates each rectangle during filtered sampling.
sheet = Image.new('RGBA',(768,2048))
x = y = height = 2
regions = {}
for name,image in sorted(assets.items()):
    if x+image.width+2>sheet.width:
        x,y,height = 2,y+height+4,0
    sheet.paste(image,(x,y))
    regions[name] = [x,y,*image.size]
    x += image.width+4
    height = max(height,image.height)
dest = root/'src/shopSprites'
sheet.crop((0,0,sheet.width,y+height+2)).save(dest/'native-art.png',optimize=True)
(dest/'native-regions.json').write_text(json.dumps(regions,indent=2)+'\n')
