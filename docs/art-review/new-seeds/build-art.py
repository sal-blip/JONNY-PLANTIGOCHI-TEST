"""Build the reviewed garden cutouts and the separate native LCD keyframes."""
from pathlib import Path
import hashlib, json, runpy, tempfile
from PIL import Image, ImageDraw

here = Path(__file__).resolve().parent
root = here.parents[2]
encoder = runpy.run_path(str(root/'.agents/skills/plantigochi-sprite-review/scripts/encode-sprite.py'))['encode']
source = here/'mature.png'
sheet = Image.open(source).convert('RGBA')
species = ['venus-flytrap','cape-sundew','white-top-pitcher']
# Crop from the transparent sheet. Anchor the flytrap at its crown between
# the petioles, above its hanging front trap. The other two meet soil at base.
sizes = [(1,32,83,119,66,42,84),(83,27,159,106,57,121,104),(163,15,240,119,73,201,117)]
for name,(left,top,right,bottom,height,soil_x,soil_y) in zip(species,sizes):
    im = sheet.crop((left,top,right,bottom))
    im.thumbnail((90,height),Image.Resampling.NEAREST)
    anchor_x = round((soil_x-left)*im.width/(right-left))
    anchor_y = round((soil_y-top)*im.height/(bottom-top))+30
    if name == 'venus-flytrap':
        # Foreshorten the front-facing trap so the face of a sculpted pot stays visible.
        crown = anchor_y-30
        front = im.crop((0,crown,im.width,im.height))
        front = front.resize((im.width,round(front.height*.56)),Image.Resampling.NEAREST)
        fitted = Image.new('RGBA',(im.width,crown+front.height))
        fitted.paste(im.crop((0,0,im.width,crown)));fitted.paste(front,(0,crown))
        im = fitted
    q = im.quantize(48,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(im.getchannel('A'))
    with tempfile.TemporaryDirectory() as tmp:
        p=Path(tmp)/'plant.png';q.save(p)
        (root/'src/shopSprites'/f'{name}.js').write_bytes(encoder(p,anchor_x,anchor_y))
(here/'spritecook-assets.json').write_text(json.dumps([dict(asset_id='691f74bc-df32-4dc6-8c41-3e45c407a37f',label='Carnivorous plant garden crowns',sha12=hashlib.sha256(source.read_bytes()).hexdigest()[:12])],indent=2)+'\n')

# LCD art uses hand-placed petioles and species-specific organs on a 72 x 28 grid.
# The same five ink indices accept healthy and care-state palettes in the toy.
organs = [
    [(-10,-9),(9,-9),(-2,-16),(-18,-4),(17,-4),(8,-16)],
    [(-8,-12),(9,-13),(-3,-19),(-16,-9),(15,-18),(4,-18)],
    [(-7,-13),(7,-16),(-1,-21),(-14,-15),(15,-19)]
]
def frame(plant,stage,pose):
    im=Image.new('P',(72,28));d=ImageDraw.Draw(im)
    if stage==0:
        x,y=35,23+(pose==1)
        forms=[[(x-2,y),(x,y-2),(x+3,y-2),(x+4,y),(x+2,y+2),(x-2,y+2)],
               [(x-3,y+1),(x+1,y-2),(x+4,y-2),(x+1,y+1),(x-2,y+2)],
               [(x-2,y-2),(x,y-3),(x+2,y-2),(x+3,y+1),(x,y+2),(x-2,y+1)]]
        d.polygon(forms[plant],fill=2,outline=1);d.point((x+1,y-1),fill=5)
        return im
    count=[0,2,3,4,len(organs[plant])][stage]
    size=[0,.46,.71,.88,1][stage]
    for i,(dx,dy) in enumerate(organs[plant][:count]):
        sx,sy=36,25
        x=sx+round(dx*size)+pose;y=sy+round(dy*size)+(pose if i%2 else 0)
        side=1 if dx>0 else -1
        d.line([(sx,sy),(round((sx+x)/2),sy-2),(x,y)],fill=1,width=2)
        d.line([(sx,sy-1),(x,y)],fill=3)
        s=max(2,round(size*4))
        if plant==0:
            # Two cupped lobes, a dark hinge and sparse interlocking cilia.
            d.ellipse((x-s-1,y-s,x+s+1,y+2),fill=3,outline=1)
            d.ellipse((x-s,y-s+1,x+s,y+1),fill=4)
            d.line([(x-s,y-s+1),(x,y),(x+s,y-s+1)],fill=1)
            for k in range(-s,s+1,2):
                edge = y-s if abs(k)<s else y-s+1
                d.point((x+k,edge-1),fill=3)
            d.point((x-s+1,y),fill=5)
        elif plant==1:
            # Burgundy tentacles follow one side of a curling strap leaf.
            pts=[(x-side*2,y+s),(x,y),(x+side*2,y-s),(x,y-s-1)]
            d.line(pts,fill=2,width=2)
            for j in range(0,2*s,2):
                tx=x+round(side*(s-j)/s);ty=y-s+j
                d.line([(tx,ty),(tx+side*3,ty-1)],fill=4)
                d.point((tx+side*3,ty-2),fill=5)
        else:
            # Tapered hollow tube, shaded mouth and a white reticulated lid.
            d.polygon([(sx+i%2,sy),(x-s,y),(x+s,y),(x+2,y+6)],fill=3,outline=1)
            d.polygon([(x-s,y),(x-s+1,y-3),(x,y-4),(x+s,y-2),(x+s,y)],fill=5,outline=4)
            d.line((x-s,y,x+s,y),fill=1);d.point((x+1,y-2),fill=4)
            d.line([(x+1,y+2),(x+1,y+5)],fill=5)
    return im
# Run-length paths preserve pixel edges at all viewport sizes.
def paths(im):
    result=['']*5
    for y in range(im.height):
        x=0
        while x<im.width:
            color=im.getpixel((x,y));end=x+1
            while end<im.width and im.getpixel((end,y))==color:end+=1
            if color:result[color-1]+=f'M{x} {y}h{end-x}v1h-{end-x}z'
            x=end
    return result
data={name:{stage:[paths(frame(i,k,p)) for p in (0,1,-1)] for k,stage in enumerate(['seed','sprout','young','split','grown'])} for i,name in enumerate(species)}
(root/'src/carnivoreFrames.js').write_text('// Generated by docs/art-review/new-seeds/build-art.py.\nexport const carnivoreFrames = '+json.dumps(data,indent=1)+';\n')
