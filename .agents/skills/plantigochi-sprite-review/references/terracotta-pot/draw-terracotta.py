"""Wheel-thrown terracotta nursery pot on the room's 65 × 67 palette grid."""
from pathlib import Path
import argparse
from PIL import Image,ImageDraw
parser=argparse.ArgumentParser()
parser.add_argument('output',nargs='?',type=Path,default=Path(__file__).with_name('terracotta-pot.png'))
args=parser.parse_args()
im=Image.new('RGBA',(65,67));pen=ImageDraw.Draw(im);cx,cy=32,60
colors={
 'deep':'#704336','oxide':'#884b38','russet':'#9c573e','kiln':'#ae6647',
 'earth':'#c17551','clay':'#ce8058','salmon':'#da8e66','sun':'#e49b72',
 'chalk':'#edb18a','rim':'#f0bd93','base':'#815440','warmfoot':'#a16e4e',
 'soilwall':'#684631','soilblack':'#4c4235','soil':'#6f5943','dust':'#998062'
}
def dot(x,y,c):pen.point((cx+x,cy+y),colors[c])
def span(x,y,n,c):
 if n:pen.line((cx+x,cy+y,cx+x+n-1,cy+y),colors[c])
def line(points,c):pen.line([(x+cx,y+cy) for x,y in points],colors[c])
def poly(points,c):pen.polygon([(x+cx,y+cy) for x,y in points],colors[c])
# Walls taper down to a wire-trimmed heel. They are wider immediately under the flared collar.
wall={-18:14,-17:14,-16:14,-15:14,-14:13,-13:13,-12:13,-11:12,-10:12,
      -9:11,-8:11,-7:11,-6:10,-5:10,-4:9,-3:9,-2:8,-1:8}
for y,r in wall.items():
 for x in range(-r,r+1):
  t=x/r
  if x==r:c='deep'
  elif x==-r:c='kiln'
  elif t>=.77:c='oxide'
  elif t>=.59:c='russet'
  elif t>=.33:c='kiln'
  elif t>=.12:c='earth'
  elif t>=-.40:c='clay'
  elif t>=-.68:c='salmon'
  else:c='earth'
  dot(x,y,c)
# A wide oxblood firing patch rolls softly around the cool side; the left side is drier and lighter.
poly([(5,-15),(10,-15),(12,-13),(11,-11),(10,-10),(10,-7),(9,-6),(8,-4),(7,-5),
      (7,-8),(8,-9),(7,-11),(6,-12)],'russet')
poly([(-10,-14),(-6,-14),(-6,-13),(-4,-12),(-2,-12),(-2,-10),(-3,-9),
      (-6,-9),(-6,-10),(-8,-10),(-8,-11),(-10,-12)],'salmon')
line([(-10,-14),(-8,-13),(-7,-13),(-6,-12)],'sun')
# Subtle throwing grooves follow two interrupted elliptical arcs, fading across the top face.
line([(-12,-12),(-10,-11),(-8,-11)],'earth')
line([(-3,-10),(0,-10),(2,-10)],'earth')
line([(5,-10),(8,-11),(10,-11)],'kiln')
line([(-9,-7),(-6,-6),(-3,-6)],'clay')
line([(1,-6),(4,-6),(6,-7)],'earth')
# Iron flecks and a chalk fleck are sparse enough to keep the unglazed surface matte.
dot(-5,-13,'chalk');dot(-4,-13,'sun');dot(4,-9,'russet');dot(-7,-5,'earth')
# A fine turning line catches on the bottom third, above a low, distinctly narrower foot.
line([(-9,-4),(-6,-3),(-3,-3),(3,-3),(7,-4)],'kiln')
line([(-7,-3),(-4,-2),(1,-2)],'salmon')
span(-8,-1,17,'base');span(-7,-1,13,'warmfoot');span(-5,-1,7,'kiln')
span(-7,0,15,'deep');span(-6,0,9,'base')
# The clay collar swells out from the tapered body. Its bottom edge bows toward the viewer.
poly([(-16,-21),(-14,-22),(13,-22),(16,-21),(16,-18),(15,-16),(11,-15),(6,-14),
      (-6,-14),(-11,-15),(-15,-16),(-16,-18)],'deep')
poly([(-15,-21),(14,-21),(15,-19),(15,-17),(11,-16),(5,-15),
      (-5,-15),(-11,-16),(-15,-17)],'kiln')
poly([(-15,-20),(4,-19),(8,-18),(8,-16),(4,-15),(-5,-15),(-11,-16),(-15,-17)],'earth')
poly([(-15,-20),(-10,-19),(-5,-18),(3,-18),(4,-17),(2,-16),
      (-5,-16),(-11,-17),(-15,-18)],'salmon')
line([(-15,-18),(-11,-17),(-8,-17)],'sun')
line([(8,-16),(12,-17),(14,-17)],'russet')
# A continuous rolled oval with a lower, shallow soil ellipse nested inside the dark fired clay.
poly([(-16,-21),(-15,-22),(-12,-23),(-7,-24),(-3,-25),(4,-25),
      (9,-24),(13,-23),(15,-22),(16,-21),(15,-20),(13,-19),(9,-18),
      (5,-17),(-5,-17),(-9,-18),(-13,-19),(-15,-20)],'clay')
line([(-16,-21),(-15,-22),(-12,-23),(-7,-24),(-3,-25),(3,-25)],'sun')
line([(-12,-23),(-7,-24),(-3,-24),(2,-24)],'chalk')
line([(4,-25),(9,-24),(13,-23),(15,-22),(16,-21)],'kiln')
# The back and side walls remain visible above the low soil, with a warmer cast than the earth.
poly([(-13,-21),(-11,-22),(-7,-23),(-3,-24),(4,-24),(9,-23),(12,-22),
      (13,-21),(12,-20),(8,-19),(4,-18),(-4,-18),(-8,-19),(-12,-20)],'soilwall')
line([(-12,-21),(-10,-22),(-6,-23),(-3,-23),(4,-23),(8,-22),(10,-22)],'russet')
line([(-10,-21),(-6,-22),(-2,-22),(4,-22),(8,-21)],'oxide')
# Quiet, low neutral-brown oval of soil with two understated gritty highlights.
poly([(-11,-20),(-7,-21),(-3,-21),(5,-21),(9,-20),(11,-20),
      (8,-19),(4,-18),(-4,-18),(-8,-19)],'soilblack')
span(-8,-20,12,'soil');span(-5,-19,13,'soil');span(-5,-20,2,'dust');dot(4,-19,'soil')
# Continuous near rolled edge. Light crosses the foreground then falls away on the right.
line([(-16,-21),(-15,-20),(-12,-19),(-8,-18),(-4,-17),(4,-17),
      (8,-18),(12,-19),(15,-20),(16,-21)],'sun')
line([(-15,-21),(-14,-20),(-11,-19),(-7,-18),(-3,-18),(0,-18)],'chalk')
line([(8,-18),(12,-19),(15,-20),(16,-21)],'earth')
im.save(args.output)
