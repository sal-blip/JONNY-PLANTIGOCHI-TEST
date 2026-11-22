"""Center the R2 porcelain pose on x=17. All coordinates are native sprite pixels."""
import argparse
from math import sqrt
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
previous = Image.open(root / 'paw-study.png').convert('RGBA')
art = Image.new('RGBA', (33,37))
pen = ImageDraw.Draw(art)
axis = 17
def reflect(x): return 2*axis-x

def symmetric_rows(rows):
    region=set()
    for y,ranges in rows.items():
        for l,r in ranges:
            for x in range(l,r+1):
                region.add((x,y));region.add((reflect(x),y))
    return region

def band_rows(left_edges, top):
    return symmetric_rows({y:[(l,axis)] for y,l in enumerate(left_edges,top)})

def swatch(level, inks):
    return inks[max(0,min(len(inks)-1,round(level*(len(inks)-1))))]

cream=['#aba398','#bdb3a4','#cdc1af','#d9cbb7','#e7d8be','#eedfc5','#f5e8ce','#fbf0d8','#fff5df']
edge=['#676863','#79776e','#8a8376','#9e9485','#aca08e']
def glazed(region,cx,cy,rx,ry,palette=cream,outline=edge):
    for x,y in region:
        nx,ny=(x-cx)/rx,(y-cy)/ry
        nz=sqrt(max(0,1-nx**2-ny**2))
        diffuse=(-.44*nx-.48*ny+.77*nz)
        light=max(0,min(1,(diffuse+.35)/1.27))
        rim=any((x+dx,y+dy) not in region for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)])
        color=swatch(light,outline if rim else palette)
        pen.point((x,y),color)

def pq(x,y,color):pen.point((x,y),color)
def run(x,y,colors):
    for i,key in enumerate(colors):
        if key!=' ':pq(x+i,y,colorset[key])

def r2_arm(rows):
    # Preserve the artist's exact high-fire glaze and bent-arm pixel clusters.
    for y,(lo,hi) in rows.items():
        for x in range(lo,hi+1):
            color=previous.getpixel((x,y))
            if color[3]:pq(x,y,color)

colorset=dict(i='#473e3f',d='#655752',s='#877469',h='#bba08c',c='#d1c1a9',a='#e1d2bb',g='#f5e7cd',w='#fff5dc',r='#a86663',p='#dc9890',k='#563e48',u='#304951',v='#38656b',t='#4c8280',l='#92b1a0',f='#f7df93',e='#ffeca4',o='#e3b75f',b='#b88245',m='#8a5d3b',j='#6f4e39',R='#975f49',P='#b47753')

# Center the low rump and both cheeks of the torso. The highlight is cast from
# the player's left just as it was on the first hand-painted porcelain study.
torso=band_rows([13,12,11,10,10,9,9,8,8,7,6,6,5,5,5,6,7,9],17)
glazed(torso,17,24,13.5,13.5)
def hip(left):
    rows={24:(10,12),25:(9,13),26:(8,13),27:(7,13),28:(6,14),
          29:(5,14),30:(5,13),31:(5,13),32:(6,12),33:(7,11)}
    points={(x,y) for y,(lo,hi) in rows.items() for x in range(lo,hi+1)}
    if not left:points={(reflect(x),y) for x,y in points}
    local=['#a49989','#b2a691','#c7b9a4','#d2c3ae','#ddceb5','#e9dbc2','#f1e2c9','#f7e8ce']
    if not left:local=['#97978b','#a6a192','#b7b09e','#c2b9a6','#cfc4ae','#dfd2b9','#e6d8be','#eedfc5']
    glazed(points,10 if left else 24,28,7,8,local,['#6e7068','#828174','#969080','#aa9d8a','#bbac95'])
for left in [True,False]:hip(left)

# The cloth drapes evenly from the centered chin to the collar point.
bib=band_rows([10,10,11,11,12,14,16],18)
glazed(bib,17,20,8.5,6,['#324e55','#3d6268','#456f72','#568781','#6c978b'],['#304b50','#375b5f','#426a69','#597e76'])
run(11,20,'lt');run(12,21,'tl');run(13,22,'t')
run(22,20,'tv');run(21,21,'vt')

# Knees and feet carry the statue's weight independently of the arms and coin.
# Their left and right masks are identical; warm light and reflected shadows differ.
feet={29:(9,11),30:(7,12),31:(6,13),32:(6,13),33:(6,13),34:(7,12)}
for left in [True,False]:
    points={(x,y) for y,(lo,hi) in feet.items() for x in range(lo,hi+1)}
    if not left: points={(reflect(x),y) for x,y in points}
    local=cream if left else ['#a69f92','#b7ad9d','#c5bbaa','#d2c6b2','#dfd1b9','#e9dac1','#f2e4cc','#f9ecd4']
    glazed(points,10 if left else 24,31,5,4.5,local,['#837a6e','#93897b','#a89a88','#b9aa94'])
run(7,32,'cghga');run(8,33,'ahga');run(22,32,'agagc');run(23,33,'ahgc')

# A straight, centered koban retains its copper plum stamp and raised left edge.
coin=band_rows([15,14,13,13,13,13,13,13,14,14,15],24)
glazed(coin,17,27,5.4,8.7,['#ab7946','#b7884d','#c79a55','#d7a65a','#e5b765','#efc878','#f7d992','#ffe8a0'],['#805e43','#8f6948','#ad814c','#c99855','#dcb672'])
run(14,25,'feooob')
run(13,26,'beooPoob')
run(13,27,'beooRoob')
run(13,28,'bePoRoPob')
run(13,29,'beoRfRoob')
run(13,30,'boooRoPob')
run(14,31,'boPoPob')
run(14,32,'mbPoofm')
run(15,33,'mboob')
run(16,34,'mbm')

# Distinct lifted palm, turned-under toes, elbow and shoulder; this is the one
# intentionally asymmetric anatomical pose, reused at its R2 anchor.
r2_arm({9:(4,8),10:(3,8),11:(3,7),12:(3,7),13:(3,7),14:(3,7),15:(3,7),
        16:(3,7),17:(3,8),18:(3,9),19:(3,10),20:(4,10),21:(5,10),
        22:(5,9),23:(7,9)})
r2_arm({19:(24,25),20:(23,26),21:(23,26),22:(23,26),23:(22,27),24:(21,26),
        25:(20,25),26:(20,23)})
# The band of blue underneath separates the two pieces of brass.
run(16,20,'mfm');run(15,21,'mfeom');run(15,22,'bfokm');run(16,23,'umm')

# Symmetric masks for the head and ear outline, but smooth directional glaze.
# Mirror only the shape; left ear is warm porcelain and the far one carries
# the intentional indigo kiln mark. Raised arm can overlap outside the mask.
head=symmetric_rows({
    2:[(10,11)], 3:[(9,12)],4:[(9,13),(15,17)],
    5:[(9,17)],6:[(9,17)],7:[(9,17)],8:[(9,17)],9:[(8,17)],
    10:[(8,17)],11:[(7,17)],12:[(7,17)],13:[(7,17)],14:[(7,17)],
    15:[(8,17)],16:[(8,17)],17:[(9,17)],18:[(11,17)],19:[(13,17)]
})
glazed(head,17,10,11,10.3)
run(10,2,'hd');run(23,2,'vu')
run(9,3,'sgws');run(22,3,'slvu')
run(10,4,'ppg');run(22,4,'prv')
run(10,5,'rppg');run(21,5,'apph')
run(10,6,'ph');run(23,6,'hp')
run(10,7,'cg');run(23,7,'ac')
# Four dark lid endpoints and their shared high horizontal arc. The inside
# corners are one warm value lighter to keep the eyes soft at a single pixel.
run(12,10,'id');run(21,10,'di')
run(11,11,'d  s');run(20,11,'s  d')
# Muzzle pads, cheeks, a centered nose leather and two upturned mouth corners.
run(14,13,'gwprpgw')
run(14,14,'gggrggg')
run(14,15,'sgwkwgs')
run(14,16,'gsdgdsg')
run(14,17,'aaagaaa')
run(8,13,'hs');run(25,13,'sh')
run(9,15,'ch');run(24,15,'hc')
run(11,17,'ac');run(22,17,'ca')

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='PNG path for the 33 × 37 transparent master')
art.save(parser.parse_args().output)
