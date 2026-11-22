"""Blue wave pot master. Drawn at room resolution; logical (0, 0) is its foot."""
import argparse
from pathlib import Path
from PIL import Image,ImageDraw
ap=argparse.ArgumentParser();ap.add_argument('output',nargs='?',type=Path,default=Path(__file__).with_name('wave-pot.png'));args=ap.parse_args()
im=Image.new('RGBA',(65,67));pen=ImageDraw.Draw(im);ax,ay=32,60
c={
 'outline':'#42565c','edge':'#627984','side':'#849a9d','pool':'#9fafaa',
 'bodyshade':'#c1cabe','body':'#e0e1d1','paper':'#f1edda','milk':'#fff3d8',
 'navy':'#294966','indigo':'#315c82','blue':'#3e739a','lapis':'#5383a0',
 'wash':'#87a8b6','water':'#b6ced0','ice':'#d9e4d8',
 'soilDark':'#4c4437','soil':'#76634a','earth':'#9f835d','sand':'#bb9e77',
 'clay':'#ab8665','buff':'#c9a57e','biscuit':'#e0be92','footdark':'#716d61',
}
def dot(x,y,key):pen.point((ax+x,ay+y),fill=c[key])
def span(x,y,n,key):
 if n>0:pen.line((ax+x,ay+y,ax+x+n-1,ay+y),fill=c[key])
def stroke(points,key):
 pen.line([(ax+x,ay+y) for x,y in points],fill=c[key])
def wall_color(x,r):
 if x<=-r+1:return 'side'
 if x<-r+3:return 'body'
 if x<=-3:return 'milk' if x<=-8 else 'paper'
 if x<=4:return 'paper'
 if x<=8:return 'body'
 if x<=r-4:return 'bodyshade'
 if x<=r-2:return 'pool'
 return 'side'
# Three sweeps of clay: a short outward lip, a soft shoulder, then the inward sweep to the foot.
radius={-19:11,-18:13,-17:14,-16:15,-15:16,-14:17,-13:17,-12:17,-11:17,-10:16,
        -9:16,-8:15,-7:15,-6:14,-5:13,-4:12,-3:10,-2:9,-1:8}
for y,r in radius.items():
 span(-r,y,r*2+1,'outline')
 for x in range(-r+1,r):dot(x,y,wall_color(x,r))
# Two courses of cobalt underglaze. The larger front fan masks the side fans where they overlap.
# Its broad ivory intervals leave the concentric curves distinct on the native room grid.
def curve(x):
 return -1 if abs(x)>=12 else 0
def inside(x,y):
 return y in radius and abs(x)<radius[y] and y<=-3
def glaze(x,y,tone):
 if inside(x,y):dot(x,y,tone)
def pigment(x):return 'indigo' if -9<=x<=6 else 'blue' if x<-9 else 'navy'
def fan(cx,base,arches,front=False):
 w=len(arches[0])-1
 for dx in range(-w,w+1):
  x=cx+dx;b=base+curve(x)
  # Reserve the porcelain ground around the crest before painting the nearer course.
  if front:
   for yy in range(b-arches[0][abs(dx)]-1,b+1):
    if inside(x,yy):dot(x,yy,wall_color(x,radius[yy]) if yy==b-arches[0][abs(dx)]-1 else ('ice' if x<4 else 'water'))
 for level,rise in enumerate(arches):
  width=len(rise)-1
  previous=None
  for dx in range(-width,width+1):
   x=cx+dx;yy=base+curve(x)-rise[abs(dx)]
   if previous is not None and abs(yy-previous)>1:
    glaze(x,max(yy,previous)-1,pigment(x))
   glaze(x,yy,pigment(x))
   # The darker curl sits in a shallow carved furrow with a little pooled blue on its lower side.
   if level==0 and dx>=-width+2 and dx<=-2 and abs(dx)%4!=1:
    glaze(x,yy+1,'lapis' if x<=4 else 'blue')
   previous=yy
for center in (-11,12):
 fan(center,-7,[[6,6,6,5,4,3,0],[3,3,2,1,0]])
fan(0,-4,[[7,7,7,6,6,5,4,3,2,0],[4,4,4,3,2,1,0],[1,1,0]],True)
# Raised pearl string above the foot rolls under the pot. A small biscuit foot is left unglazed.
for x in range(-11,12):
 yy=-3+(-1 if abs(x)>7 else 0)
 if inside(x,yy):dot(x,yy,'side' if x>6 else 'body' if x<0 else 'bodyshade')
span(-8,-2,17,'outline');span(-7,-2,12,'indigo');span(-5,-2,7,'lapis')
span(-8,-1,17,'footdark');span(-7,-1,14,'clay');span(-6,-1,9,'buff');span(-5,-1,4,'biscuit')
span(-7,0,15,'outline');span(-6,0,10,'footdark')
# A continuous, asymmetric, gently pinched rolled rim. Back edge sits higher than the front return.
outline=[(-11,-22),(-7,-23),(7,-23),(11,-22),(13,-21),(14,-20),(14,-18),(12,-17),(8,-16),(-7,-16),(-12,-17),(-14,-18),(-14,-20),(-13,-21)]
pen.polygon([(ax+x,ay+y) for x,y in outline],fill=c['edge'])
span(-7,-23,14,'body');span(-11,-22,22,'paper');span(-12,-21,25,'paper')
span(-13,-20,27,'body');span(-13,-19,27,'paper');span(-12,-18,25,'body');span(-8,-17,17,'bodyshade')
span(-9,-22,13,'milk');span(-12,-21,7,'milk');span(-13,-20,4,'milk')
span(8,-22,3,'bodyshade');span(10,-21,3,'pool');span(11,-20,3,'side');span(12,-19,2,'side')
span(-8,-21,17,'soilDark');span(-11,-20,22,'soilDark');span(-10,-19,21,'soil')
span(-7,-18,14,'soil');span(-7,-18,6,'earth');span(2,-19,3,'earth');dot(-6,-19,'sand')
# The tiny front ellipse splits the cobalt pooled underglaze from the light on the lip above it.
stroke([(-13,-19),(-10,-18),(-6,-17),(5,-17),(10,-18),(13,-19)],'bodyshade')
stroke([(-13,-19),(-10,-18),(-6,-17),(2,-17)],'milk')
stroke([(-13,-17),(-8,-16),(-4,-15),(5,-15),(11,-16),(13,-17)],'lapis')
stroke([(-10,-16),(-5,-15),(2,-15)],'wash')
# Two dabs of specular glaze carry the left-hand window light into the shoulder.
span(-12,-15,3,'milk');span(-13,-14,2,'milk')
im.save(args.output)
