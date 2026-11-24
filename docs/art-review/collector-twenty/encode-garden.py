"""Split and anchor each SpriteCook strip at its soil contact, keeping hard pixel edges."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib,json,runpy
import numpy as np
from scipy.ndimage import label,find_objects
from PIL import Image

here=Path(__file__).resolve().parent
root=here.parents[2]
ids=list(json.loads((root/'src/collectorSeeds.json').read_text()))
encode=runpy.run_path(str(root/'.agents/skills/plantigochi-sprite-review/scripts/encode-sprite.py'))['encode']
heights=[57,65,62,75,83,76,54,62,46,62,64,45,67,47,67,61,70,62,79,59]
records=[]
sources=[]
for index in range(7):
    path=here/f'group-{index+1}.png'
    image=Image.open(path).convert('RGBA')
    array=np.array(image);lab,n=label(array[:,:,3]>100,np.ones((3,3)))
    items=[]
    for k,s in enumerate(find_objects(lab),1):
        if s is not None and (lab[s]==k).sum()>80:items.append((s,k))
    group=ids[index*3:index*3+3]
    if len(items)!=len(group):raise ValueError(f'{path.name}: expected {len(group)} foliage crowns, found {len(items)}')
    items.sort(key=lambda item:item[0][1].start)
    for j,(sku,(s,k)) in enumerate(zip(group,items)):
        crop=array[s].copy()
        crop[:,:,3]=np.where(lab[s]==k,255,0)
        piece=Image.fromarray(crop)
        h=heights[index*3+j];factor=min(h/piece.height,88/piece.width)
        piece=piece.resize((max(1,round(piece.width*factor)),max(1,round(piece.height*factor))),Image.Resampling.NEAREST)
        alpha=np.array(piece)[:,:,3]
        # Center on the basal stem, independent of which way the foliage leans.
        ys,xs=np.nonzero(alpha[-3:]);cx=int(np.median(xs))
        root_y=piece.height-1
        if sku=='birds-nest-fern':
            # A drooping frond extends below the rosette. Seat its actual crown in soil.
            cx=round(piece.width*.51);root_y=round(piece.height*.88)
        if sku=='goldfish-plant':cx=piece.width//2
        q=piece.quantize(46,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGBA');q.putalpha(piece.getchannel('A'))
        # Divide only the basal stem connected to the root. Trailing leaves stay in front.
        strips=[]
        for y in range(max(0,root_y-7),root_y+1):
            runs=np.where(alpha[y]>0)[0];near=runs[abs(runs-cx)<=6]
            if len(near):strips.append([y-root_y-30,y-root_y-30,int(near.min())-cx,int(near.max())-cx])
        with TemporaryDirectory() as tmp:
            png=Path(tmp)/'crown.png';q.save(png)
            js=encode(png,cx,root_y+30).decode()
        name='plant'+str(index*3+j)
        records.append((name,sku,js,strips))
    sources.append(dict(asset_id=(here/f'group-{index+1}.id').read_text().strip(),sha12=hashlib.sha256(path.read_bytes()).hexdigest()[:12],label=', '.join(group)))
target=root/'src/shopSprites/collectorFoliage.js'
with target.open('w') as f:
    f.write('// Generated from the reviewed SpriteCook strips by encode-garden.py.\nexport const collectorFoliage = {\n')
    for name,sku,js,strips in records:
        obj={}
        # Encoder returns canonical indexed rows and anchored offsets.
        import re
        xy=re.search(r'x:(-?\d+), y:(-?\d+)',js)
        obj['spriteOffset']={'x':int(xy[1]),'y':int(xy[2])}
        obj['spritePalette']=json.loads(js.split('export const spritePalette = ')[1].split(';\n')[0])
        rows=js.split('export const spriteRows = [\n')[1].splitlines()[:-1]
        obj['spriteRows']=[json.loads(line.strip().removesuffix(',')) for line in rows]
        obj['stalks']=strips
        f.write(json.dumps(sku)+': '+json.dumps(obj,indent=1)+',\n')
    f.write('};\n')
(here/'spritecook-assets.json').write_text(json.dumps(sources,indent=2)+'\n')
