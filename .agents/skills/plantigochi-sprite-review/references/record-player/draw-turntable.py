"""Late-1970s walnut turntable, with a native-pixel machined platter and S arm."""
from argparse import ArgumentParser
from pathlib import Path
from math import atan2, degrees, sqrt
from PIL import Image, ImageDraw
parser = ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='destination PNG for the transparent base sprite')
args = parser.parse_args()
im=Image.new('RGBA',(47,41));d=ImageDraw.Draw(im)
ox,oy=23,35
def rgb(c):return '#'+c
def p(x,y,c):d.point((ox+x,oy+y),rgb(c))
def line(pts,c):
    d.line([(ox+x,oy+y) for x,y in pts],rgb(c),width=1)
def rect(x,y,w,h,c):d.rectangle((ox+x,oy+y,ox+x+w-1,oy+y+h-1),rgb(c))
def poly(pts,c):d.polygon([(ox+x,oy+y) for x,y in pts],fill=rgb(c))
def ell(cx,cy,rx,ry,c):
    mask=[]
    for y in range(int(cy-ry)-1,int(cy+ry)+2):
        xs=[x for x in range(int(cx-rx)-1,int(cx+rx)+2) if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1]
        if xs:
            mask+= [(x,y) for x in xs]
            rect(min(xs),y,max(xs)-min(xs)+1,1,c)
    return mask

# Four isolation supports. Only the two front feet clear the front fascia.
for x in [-17,12]:
    rect(x,-3,5,3,'38393c');rect(x+1,-3,3,1,'938b77')
    rect(x+1,-2,3,1,'535456');rect(x+1,-1,3,1,'302f33')
# The two diagonals of the depth plane project in the same direction; the
# top of the rear lip is y=-23 and the front edge falls on y=-8.
poly([(-16,-24),(20,-24),(22,-22),(22,-18),(18,-4),(16,-2),(-18,-2),(-21,-4),(-21,-8)],'383532')
poly([(18,-9),(21,-21),(22,-22),(21,-15),(18,-4),(16,-3),(16,-7)],'704a37')
line([(20,-17),(18,-10),(17,-7)],'99663e')
poly([(-20,-9),(17,-9),(17,-4),(15,-3),(-17,-3),(-20,-4)],'955e44')
# The walnut front is a continuous veneered face with a tiny maker's insert.
rect(-19,-8,35,1,'ddaa70');rect(-19,-7,35,1,'be875b')
line([(-20,-6),(-15,-5),(-10,-5)],'ae7953')
line([(-5,-6),(1,-6),(5,-5),(13,-5)],'ad7851')
line([(-17,-4),(-11,-4),(-8,-5),(-4,-5)],'87553f')
rect(-18,-3,34,1,'684539');rect(-16,-2,30,1,'493b36')
rect(10,-7,5,2,'755544');rect(11,-7,4,1,'e2b77c')
# A narrow walnut chamfer surrounds the champagne-silver inset chassis.
poly([(-16,-24),(20,-24),(21,-23),(17,-8),(-20,-8),(-20,-10)],'b47c52')
line([(-16,-24),(19,-24)],'e2bb84');line([(-19,-10),(-15,-23)],'e2b57a')
line([(-20,-8),(17,-8)],'f1c489')
poly([(-14,-23),(19,-23),(15,-9),(-18,-9)],'a5aaa0')
poly([(-14,-22),(18,-22),(15,-10),(-17,-10)],'d8d5ba')
line([(-12,-22),(16,-22)],'f2e4c5');line([(16,-15),(15,-11)],'aaa998')
# Satin aluminium platter below the LP. The front rim remains visible as a
# continuous curved machined ring with a sparse row of stroboscope dots.
cx,cy=-4,-16
ell(cx,cy+2.3,13.4,6.8,'67695f')
ell(cx,cy+1.7,13.2,6.55,'484d4e')
ell(cx,cy+.95,13.35,6.55,'bfccbd')
ell(cx,cy+.45,13.1,6.5,'e1e0c5')
for x,y in [(-15,-11),(-13,-10),(-11,-9),(-8,-9),(-5,-8),(-2,-8),(1,-9),(4,-9),(6,-10),(8,-11)]:
    p(x,y,'e6e5ce')
# Physically projected ellipse. Fixed lighting appears only on two sectors
# of the grooves while the printed artwork rotates about the spindle.
rx,ry=12.8,6.25
vinyl=ell(cx,cy,rx,ry,'292d36')
for x,y in vinyl:
    nx,ny=(x-cx)/rx,(y-cy)/ry;r=sqrt(nx*nx+ny*ny)
    ang=(degrees(atan2(ny,nx))+360)%360
    c='282b33'
    if r>.91:c='353b46'
    if 205<ang<273 and r>.52: c='414c5a'
    if 25<ang<72 and r>.56: c='37414d'
    if (.72<r<.79 or .91<r<.99) and (202<ang<264 or 24<ang<75):c='596574'
    if .60<r<.70 and (191<ang<246 or 21<ang<70):c='394451'
    if .56<r<.66 and (199<ang<259 or 16<ang<78): c='53606b'
    if .81<r<.88 and (194<ang<247 or 29<ang<83): c='222a36'
    if .45<r<.53: c='20252e'
    p(x,y,c)
for x,y in [(-12,-20),(-11,-21),(-9,-21),(-6,-22)]:p(x,y,'68737c')
# Pale celadon label with a deep-teal second ink. Chrome spindle is a dot
# in the center; the paired label strokes are added for each of seven frames.
ell(cx,cy,4.4,2.45,'597e76')
ell(cx,cy-.2,3.9,2.15,'8fb8a4')
line([(-6,-18),(-5,-18)],'adcbb3')
p(-4,-16,'eee7ca');p(-4,-15,'466863')
# The tonearm has a cast base, a fat pivot bearing, steel counterweight,
# polished swept tube and cartridge head. Drop a shadow under the tube first.
ell(14,-20.2,3.6,2.3,'6d756f');ell(14,-21.2,3.25,2.25,'4c5657')
ell(14,-21.7,2.8,1.7,'82918a')
# Sleeve of the counterweight, behind the bearing on the upper right.
line([(14,-22),(17,-25)],'515c5c')
poly([(15,-25),(17,-26),(19,-25),(19,-24),(17,-23),(15,-24)],'4b5353')
line([(15,-25),(17,-26),(18,-25)],'c4c8b5');line([(16,-24),(18,-25)],'8e9a93')
ell(14,-21.9,1.7,1.45,'c6cebb');p(14,-22,'f3edcf');p(15,-22,'838f8a')
# The S bend brings the headshell inward to the lower right outer grooves.
line([(14,-20),(14,-18),(12,-15),(10,-14),(8,-14)],'8f9488')
line([(14,-21),(14,-18),(12,-16),(10,-15),(7,-15)],'465456')
line([(13,-20),(13,-18),(11,-16),(9,-16),(6,-16)],'e9e9d3')
line([(13,-20),(13,-19)],'f8efda');p(12,-17,'c8cfbf');p(8,-16,'acb9af')
# Cartridge runs along a tangent of the record in plan view. A tiny warm
# stylus grip makes its contact point readable against the charcoal disc.
poly([(4,-17),(6,-17),(8,-16),(6,-14),(3,-13),(2,-14),(2,-15)],'3d4548')
line([(5,-17),(7,-16)],'8b9c99');line([(3,-16),(5,-16)],'b2bbb1')
rect(2,-15,3,1,'aa5545');rect(2,-14,2,1,'de8361');p(4,-14,'85483f');p(2,-13,'585352')
# Speed/start controls in the clear outer front-left corner and cue lever on the right.
rect(-18,-10,3,1,'495757');p(-18,-10,'f0c67c')
rect(13,-11,2,1,'677670');p(13,-12,'abb2a1')
im.save(args.output)
