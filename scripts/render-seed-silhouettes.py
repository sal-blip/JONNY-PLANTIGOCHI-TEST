"""Render collection masks from the game's mature foliage. Run with Node 24 and Pillow."""
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
destination = root / 'public/art/seed-silhouettes'
destination.mkdir(exist_ok=True)
# The reduced-motion bare renderer emits opaque integer pixel runs without a pot.
command = """
import {growthOrder} from './src/game.js';
import {drawPottedPlant} from './src/roomPlant.js';
const masks = {};
for (const species of growthOrder) {
  const runs = [];
  const ctx = {save(){}, restore(){}, fillRect(x,y,w,h){ runs.push([x,y,w,h]); }};
  drawPottedPlant(ctx,{x:0,y:0,size:2,plant:{id:'nursery-'+species,species},
    bare:true,preview:true,reducedMotion:true});
  masks[species] = runs;
}
console.log(JSON.stringify(masks));
"""
masks = json.loads(subprocess.check_output(['node','--input-type=module','-e',command],cwd=root))
unique = set()
for species,runs in masks.items():
    left = min(x for x,y,w,h in runs)
    top = min(y for x,y,w,h in runs)
    width = max(x+w for x,y,w,h in runs)-left
    height = max(y+h for x,y,w,h in runs)-top
    mask = Image.new('L',(width,height))
    pen = ImageDraw.Draw(mask)
    for x,y,w,h in runs:
        pen.rectangle((x-left,y-top,x-left+w-1,y-top+h-1),fill=255)
    scale = min(55/width,52/height)
    mask = mask.resize((round(width*scale),round(height*scale)),Image.Resampling.NEAREST)
    canvas = Image.new('L',(64,64))
    canvas.paste(mask,((64-mask.width)//2,(64-mask.height)//2))
    if canvas.tobytes() in unique:
        raise ValueError(f'Duplicate seed silhouette: {species}')
    unique.add(canvas.tobytes())
    portrait = Image.new('RGBA',canvas.size,'#293d38')
    portrait.putalpha(canvas)
    portrait.save(destination/(species+'.png'),optimize=True)
print(f'Rendered {len(unique)} distinct collection silhouettes.')
