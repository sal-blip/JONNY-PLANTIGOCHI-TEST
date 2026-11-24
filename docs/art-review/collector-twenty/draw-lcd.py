"""Draw the toy-native growth atlas. A cell is the 72 × 28 area above the toy pot."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[3]
ids=list(json.loads((root/'src/collectorSeeds.json').read_text()))
# Each hand-drawn organ has a dark outline, midtone, highlight and detail.
glyphs={
 'strap':['    oo','   ohmo','   ommo','  ohmo','  ommo',' ohmo',' ommo',' omo',' om',' o'],
 'fanlet':[' oo oo','ohhohho','omhhmmo',' ommmo','  omo','   o'],
 'lobed':['    oo','    oh',' oo om oo',' ohhomohmo','  omhhmmo',' oo ommo',' ohhomoo','  omhm','    mo','    o'],
 'palmfan':[' o  o  o',' oh ohoho',' ohhohmho oo','  omhmhmhom','   omhmhmm','   ommhmm','    ommo','     oo'],
 'panda':['  oaao',' oahhmo',' ohhhmo',' ohhmmo',' oahhmo','  ommo','  ommo','   oo'],
 'tube':['  oaaao','  ammmo','  ohhmo','  ohmo',' ohmo',' ommo',' omo',' oo'],
 'zebra':['   o','   ho','  ommo','  ohho',' ommmmo',' ohhhmo',' ommmmo','ohhhmmo',' ommmo','  ooo'],
 'melon':['   oooo','  ohmhmo',' ohmhmhmo','ohmhmhmmo','omhmhmhmo',' omhmhmmo','  omhmmo','   oooo'],
 'coin':['   oooo','  ohhhmo',' ohhhmmmo',' ohmmhmmo',' ommmmmmo','  ommmmo','   oooo'],
 'squill':['     oo','   ohhmo','  ohommo',' ohhhmo',' ohommo',' omhmo',' ommo','  oo'],
 'heart':[' ooo ooo','ohhhohhmo','ohhhhmmmo',' ommhmmmo','  omhmmo','   ommo','    oo'],
 'arrow':['    o','   oho','  ohhmo',' ohhhmmo','ohhmhmmmo','omhmmhmmo','oo  m  oo','    o'],
 'spiral':['   ooooo',' oohhhhmo','ohhmmmhhmo','ohmhhhmhmo','ohmhmmmhmo','omhmhhhmmo',' ommmmmmo','   ooooo'],
 'pair':['  oo',' ohmo',' ohmmo','  ommo','   oo'],
 'spathe':[' aa  aa','ahhaahma','ahhhammma',' ahhamma','  ahmma','   ama','    a'],
 'violet':[' aa aa','ahhahha',' aaaa','aaamhaaa','ahhahhha',' aa aaa','   aa'],
 'flame':['a   a','ha aha','ahaaha',' ahhaa','  ahaa','   aa','    a'],
 'fish':['    aa',' a aaha','aahhhhma',' ahhmmmaa','  aaaaa'],
 'shrimp':[' aaa','ahhha',' ahmma','  ahhma','   ahhma','    ammma','      hh'],
 'lip':['   aa','  ahha','  ahha',' ahhma',' ommma','  ommo','   oo']
}
# Palettes are authored for the LCD. The garden drawings are produced separately.
styles=[
 ('strap','rosette','547737 95ba4c c9d77b 5c7941'),('fanlet','wire','476c47 80a967 b4cb7d 473c3c'),('lobed','rosette','426b69 72a09a a6c6ab 5b8176'),
 ('strap','fountain','52763c 83a94f b9bf70 987453'),('strap','tree','525e42 759242 a0ae60 ad545e'),('palmfan','fan','51743d 82a253 b8bf63 8c8050'),
 ('panda','cluster','687968 9ca995 c6c9b4 9b6350'),('tube','tree','486f48 80a850 a4c267 ae6450'),('zebra','rosette','37584b 52745b c9d1b8 a7b4a1'),
 ('melon','fan','3a6549 5d8659 c0c6a7 995953'),('coin','fan','426e47 6c9c60 b0c786 658461'),('squill','cluster','51665c 879c88 c5cfac 80536d'),
 ('heart','spathe','426343 6b915d e8aa60 bf4555'),('coin','violet','4a6348 6e8a5f c5a8e0 81599c'),('heart','flame','416b54 76917b f1abbb c85583'),
 ('pair','fish','345e44 689453 f6ae59 da7438'),('pair','shrimp','4c734d 79945c f0b1a3 c57976'),('pair','lip','395b49 68815f f08271 ac4050'),
 ('arrow','fan','3c6147 658957 a5ab69 aa9158'),('spiral','fan','49584e 617766 c4c6af 845d69')]
base=(36,26)
def stamp(d,key,x,y,size,flip,colors):
    rows=glyphs[key];w=max(map(len,rows));h=len(rows)
    raw=Image.new('RGBA',(w,h))
    for j,row in enumerate(rows):
        for i,ch in enumerate(row):
            if ch!=' ':raw.putpixel((i,j),colors[ch])
    if flip:raw=raw.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    raw=raw.resize((max(2,round(w*size)),max(2,round(h*size))),Image.Resampling.NEAREST)
    d.alpha_composite(raw,(round(x-raw.width/2),round(y-raw.height+1)))
def rgba(h):return tuple(bytes.fromhex(h))+(255,)
def cell(i,stage,pose):
    glyph,habit,inks=styles[i];dark,mid,light,detail=map(rgba,inks.split())
    col=dict(o=rgba('343d39'),m=mid,h=light,a=detail)
    im=Image.new('RGBA',(72,28));pen=ImageDraw.Draw(im)
    if stage==0:
        w=5+i%4;h=4+(i//4)%3;x=36-w//2;y=24-h+int(pose==1)
        pen.ellipse((x,y,x+w,y+h),fill='#816343',outline='#493b35')
        pen.point((x+1+i%2,y+1),fill=light);return im
    scale=[0,.42,.67,.86,1][stage]
    # Draw the joints and organs back to front. Juveniles carry fewer organs.
    def point(dx,dy):
        return (36+round(dx*scale)+pose*min(2,round(abs(dy)/9)),26+round(dy*scale))
    def limb(a,b,ink,width=1):pen.line([a,b],fill=ink,width=width)
    def canopy(key,targets):
        for j,(dx,dy) in enumerate(targets):
            x,y=point(dx,dy);attach=point(dx*.4,dy*.55)
            limb(base,attach,dark,2);limb(attach,(x,y),detail if i in (1,9,18) else dark)
            if i==18:
                for k in (.25,.52,.78):
                    pen.point((round(attach[0]+(x-attach[0])*k),round(attach[1]+(y-attach[1])*k)),fill=col['o'])
            stamp(im,key,x,y,scale*(1.28 if habit=='fan' else 1.02),dx<0,col)
    count=[0,2,3,5,7][stage]
    points=[(-7,-6),(7,-8),(0,-12),(-14,-4),(13,-4),(-8,-13),(8,-14)]
    if habit in ('fan','rosette','cluster'):
        canopy(glyph,points[:count])
        if i==11:
            for x in range(34,39,3):pen.ellipse((x-2,23,x+1,26),fill=detail,outline=dark)
    elif habit=='wire':
        for dx,dy in points[:count]:
            end=point(dx*1.2,dy-3); joint=point(dx*.47,dy*.65)
            limb(base,joint,detail);limb(joint,end,detail)
            for k in (.5,.82,1):
                x=round(joint[0]+(end[0]-joint[0])*k);y=round(joint[1]+(end[1]-joint[1])*k)
                stamp(im,glyph,x+(-2 if k==.82 else 2),y,.78*scale,dx<0,col)
    elif habit in ('fountain','tree'):
        trunk=point(0,-10);limb(base,trunk,detail,max(1,round(3*scale)))
        if habit=='fountain':
            pen.ellipse((33,21,39,26),fill=detail,outline=dark)
        crowns=[(0,-11)] if stage<=2 or habit=='fountain' else [(-6,-12),(7,-9)]
        for cx,cy in crowns:
            crown=point(cx,cy);limb(trunk,crown,detail,2)
            for j in range(3+stage):
                f=(j-(2+stage)/2)/(1+stage/2)
                if glyph=='tube':
                    tx,ty=point(cx+f*8,cy-3+abs(f)*3)
                    limb(crown,(tx,ty),dark);stamp(im,glyph,tx,ty,scale,tx<36,col)
                else:
                    arc=point(cx+f*9,cy-8+abs(f)*2)
                    tip=point(cx+f*(16 if habit=='fountain' else 10),cy+(3 if habit=='fountain' else -6)*abs(f)-1)
                    limb(crown,arc,mid,2);limb(arc,tip,detail if i==4 else light)
    else:
        flowers=habit
        canopy(glyph,[(dx,dy*.65) for dx,dy in points[:count]])
        if stage>=3:
            targets=[(-7,-11)] if stage==3 else [(-10,-11),(1,-15),(11,-10)]
            for dx,dy in targets:
                x,y=point(dx,dy);limb(base,(x,y),dark)
                stamp(im,flowers,x,y,scale*1.13,dx<0,col)
    return im
for i,sku in enumerate(ids):
    atlas=Image.new('RGBA',(72*3,28*5))
    for stage in range(5):
        for column,pose in enumerate([0,1,-1]):
            atlas.paste(cell(i,stage,pose),(column*72,stage*28))
    atlas.save(root/'public/art/collector-seeds'/f'{sku}.png',optimize=True)
