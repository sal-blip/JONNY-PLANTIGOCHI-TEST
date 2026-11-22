"""Draw the tabletop oak frame, paper mat, and original ginkgo print at room resolution."""
from pathlib import Path
import argparse
from PIL import Image,ImageDraw
parser=argparse.ArgumentParser();parser.add_argument('output',nargs='?',type=Path,default=Path(__file__).with_name('oak-frame.png'));args=parser.parse_args()
im=Image.new('RGBA',(47,41));d=ImageDraw.Draw(im);ax,ay=23,36
c={'edge':'#634d3a','dark':'#73543b','heart':'#8a6040','shade':'#a7794e','oak':'#b88a59',
   'honey':'#cea36c','light':'#deb884','pearl':'#edd09a','rim':'#947453','end':'#b9976c',
   'board':'#775e4b','inner':'#685b4a','matShade':'#b6ad95','mat':'#ded8bf','deckle':'#f2e7c8',
   'paper':'#3e625d','paperLight':'#496c63','paperDeep':'#3a5b57','branch':'#bb9a58',
   'gold':'#d7b260','olive':'#a59954','amber':'#b8924c','saffron':'#e4c66d','ray':'#f0d68a',
   'stamp':'#ad735d','seal':'#ce9474'}
def P(x,y):return(x+ax,y+ay)
def box(x,y,w,h,k):d.rectangle((x+ax,y+ay,x+ax+w-1,y+ay+h-1),c[k])
def line(pts,k):d.line([P(x,y) for x,y in pts],c[k])
def poly(pts,k):d.polygon([P(x,y) for x,y in pts],c[k])
# The backboard leans on an easel leg. Its tiny triangular opening transmits the room behind it.
poly([(14,-18),(15,-18),(16,-15),(17,-12),(18,-9),(19,-6),(20,-3),(20,-1),(19,-1),(18,-4),(17,-7),(16,-10),(15,-13)],'edge')
line([(15,-16),(16,-13),(17,-10),(18,-7),(19,-4),(19,-2)],'shade');box(19,-1,2,1,'end')
box(-12,-1,5,1,'board');box(8,-1,5,1,'board')
# The outside edge, four mitred boards, a cut back bevel and a small return to the mat.
poly([(-15,-30),(15,-30),(16,-29),(16,-2),(15,-1),(-15,-1),(-16,-2),(-16,-29)],'edge')
poly([(-15,-29),(15,-29),(11,-25),(-11,-25)],'honey')
poly([(-15,-29),(-11,-25),(-11,-6),(-15,-2)],'oak')
poly([(15,-29),(15,-2),(11,-6),(11,-25)],'shade')
poly([(-15,-2),(-11,-6),(11,-6),(15,-2)],'oak')
# Edge moulding catches the light most strongly on its upper-left quadrant.
line([(-14,-30),(-1,-30),(5,-30)],'light');line([(-15,-29),(-6,-29),(2,-29)],'pearl')
line([(7,-29),(13,-29)],'light');line([(-16,-27),(-16,-17)],'honey')
line([(-15,-27),(-15,-17),(-15,-15)],'light')
line([(15,-27),(15,-21)],'oak');line([(-13,-2),(-1,-2),(7,-2)],'honey')
line([(11,-25),(-11,-25),(-11,-6)],'dark')
line([(-11,-6),(11,-6),(11,-25)],'heart')
line([(-10,-25),(9,-25)],'rim');line([(11,-23),(11,-8)],'end')
line([(-10,-6),(9,-6)],'pearl');line([(-11,-23),(-11,-11)],'shade')
# Four join lines follow the wood grain from the outside edges to the rabbet.
line([(-15,-29),(-12,-26)],'shade');line([(15,-29),(12,-26)],'heart')
line([(-15,-2),(-12,-5)],'heart');line([(15,-2),(12,-5)],'dark')
# Long grain flows parallel to each rail. Tiny medullary rays alternate with the finer vessels.
line([(-10,-27),(-5,-27),(-3,-28),(2,-28)],'oak');box(5,-27,4,1,'light')
line([(-14,-24),(-14,-18),(-13,-16),(-13,-13)],'honey');box(-14,-9,1,3,'shade')
line([(13,-23),(13,-18),(14,-16),(14,-11)],'heart');box(12,-14,1,4,'oak')
line([(-8,-4),(-4,-4),(-2,-3),(2,-3)],'shade');box(4,-4,5,1,'honey')
# Paper mat casts a 1-pixel shadow toward the upper-left of the square image aperture.
box(-10,-24,21,18,'mat');box(-10,-24,1,18,'matShade');box(-9,-25,19,1,'mat')
box(-9,-24,18,1,'matShade');box(-9,-24,1,17,'matShade')
box(9,-24,1,18,'deckle');box(-8,-7,18,1,'deckle')
# The exact 17x17 painted region matches the player's full-resolution photograph aperture.
pic=Image.new('RGB',(17,17),c['paper']);ink=ImageDraw.Draw(pic)
def pl(points,k):ink.line(points,c[k])
def pp(points,k):ink.polygon(points,c[k])
def pt(x,y,k):ink.point((x,y),c[k])
pp([(0,0),(16,0),(16,3),(13,2),(8,2),(5,3),(0,3)],'paperLight')
# A ginkgo fan with two rounded lobes, a cleft, a tapered base and a fine curved petiole.
pl([(7,9),(8,10),(10,12),(12,14),(13,15)],'branch');pl([(10,12),(11,13),(12,13)],'gold')
pp([(7,11),(4,9),(2,8),(1,8),(0,6),(1,5),(3,5),(3,4),(5,3),(7,3),(7,5),(6,7),(7,9)],'amber')
pp([(7,9),(5,8),(3,7),(1,7),(1,6),(4,5),(4,4),(6,4),(6,5),(5,6)],'saffron')
pl([(1,6),(4,6),(6,8),(7,10)],'gold');pl([(4,4),(5,5),(6,8)],'ray')
pp([(7,11),(7,8),(8,6),(10,3),(11,2),(13,2),(13,3),(15,3),(16,5),(15,6),
    (14,7),(12,7),(11,8),(10,9),(8,10)],'olive')
pp([(7,10),(8,7),(9,5),(11,3),(12,2),(13,3),(15,3),(15,5),(12,7),(11,7),(9,9)],'gold')
pp([(8,8),(10,4),(11,3),(12,3),(11,5),(10,7)],'saffron')
pl([(8,9),(10,6),(12,4)],'ray');pl([(9,9),(12,6),(14,5)],'amber');pt(15,4,'saffron')
# Small personal seal printed in faded cinnabar in the lower-left of the study.
ink.rectangle((1,13,3,15),fill=c['stamp']);pt(2,14,'paper');pt(3,13,'seal')
im.paste(pic,P(-8,-24))
im.save(args.output)
